import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.auth.models.user import User
from app.modules.tasks.models.task import Task, TaskStatus
from app.modules.tasks.models.task_attachment import TaskAttachment
from app.modules.tasks.models.task_history import TaskHistory
from app.modules.tasks.schemas.task import TaskFileResponse
from app.modules.tasks.services import attachments
from app.modules.tasks.services.task_rules import (
    ACTION_APPROVED,
    ACTION_ATTACHMENT_ADDED,
    ACTION_ATTACHMENT_REMOVED,
    ACTION_EXECUTION_UPDATED,
    ACTION_REJECTED,
    ACTION_RESUMED,
    ACTION_STARTED,
    ACTION_SUBMITTED,
    apply_transition,
    ensure_editable,
)
from app.modules.translators.services.storage import SIGNED_URL_EXPIRES_IN

logger = logging.getLogger(__name__)

TASK_NOT_FOUND = "Tarefa não encontrada"


# EXECUCAO PELO FUNCIONARIO E AVALIACAO PELOS USUARIOS ADMINISTRATIVOS
class TaskWorkflowService:
    def __init__(self, db: Session):
        self.db = db

    def list_for_assignee(self, user: User, task_status: TaskStatus | None = None) -> list[Task]:
        statement = select(Task).where(Task.assignee_id == user.id)
        if task_status is not None:
            statement = statement.where(Task.status == task_status)
        return list(self.db.scalars(statement.order_by(Task.created_at.desc())).unique().all())

    def list_all(
        self,
        *,
        task_status: TaskStatus | None = None,
        assignee_id: uuid.UUID | None = None,
    ) -> list[Task]:
        statement = select(Task)
        if task_status is not None:
            statement = statement.where(Task.status == task_status)
        if assignee_id is not None:
            statement = statement.where(Task.assignee_id == assignee_id)
        return list(self.db.scalars(statement.order_by(Task.created_at.desc())).unique().all())

    def get_visible(self, task_id: uuid.UUID, viewer: User, *, can_review: bool) -> Task:
        task = self._get_or_404(task_id)
        if not can_review and task.assignee_id != viewer.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=TASK_NOT_FOUND)
        return task

    def history(self, task_id: uuid.UUID, viewer: User, *, can_review: bool) -> list[TaskHistory]:
        task = self.get_visible(task_id, viewer, can_review=can_review)
        return list(
            self.db.scalars(
                select(TaskHistory)
                .where(TaskHistory.task_id == task.id)
                .order_by(TaskHistory.created_at, TaskHistory.id)
            ).all()
        )

    def start(self, task_id: uuid.UUID, user: User) -> Task:
        return self._transition(self._get_assigned(task_id, user), user, ACTION_STARTED)

    def update_execution(self, task_id: uuid.UUID, user: User, description: str) -> Task:
        task = self._get_assigned(task_id, user)
        ensure_editable(task)
        task.execution_description = description
        self._record(task, user, ACTION_EXECUTION_UPDATED, {"execution_description": description})
        return self._commit(task)

    def add_attachment(
        self,
        task_id: uuid.UUID,
        user: User,
        filename: str,
        content: bytes,
        declared_type: str | None,
    ) -> Task:
        task = self._get_assigned(task_id, user)
        ensure_editable(task)
        if len(task.attachments) >= attachments.TASK_ATTACHMENT_MAX_COUNT:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"A tarefa já possui o limite de {attachments.TASK_ATTACHMENT_MAX_COUNT} anexos."
                ),
            )
        attachments.validate_attachment(filename, content)
        content_type = attachments.resolve_content_type(filename, declared_type)

        # 1) ARMAZENA O ARQUIVO; SE FALHAR, NADA E GRAVADO NO BANCO
        object_path = attachments.build_attachment_path(task.id, filename)
        attachments.upload_attachment(object_path, content, content_type)

        # 2) GRAVA A REFERENCIA; SE FALHAR, REMOVE O ARQUIVO PARA NAO DEIXAR OBJETO ORFAO
        attachment = TaskAttachment(
            storage_path=object_path,
            filename=filename[:255],
            content_type=content_type,
            size_bytes=len(content),
            uploaded_by_id=user.id,
        )
        task.attachments.append(attachment)
        try:
            self.db.flush()
            self._record(
                task,
                user,
                ACTION_ATTACHMENT_ADDED,
                {"attachment_id": str(attachment.id), "filename": attachment.filename},
            )
            return self._commit(task)
        except Exception:
            self.db.rollback()
            self._discard(object_path)
            raise

    def remove_attachment(self, task_id: uuid.UUID, attachment_id: uuid.UUID, user: User) -> Task:
        task = self._get_assigned(task_id, user)
        ensure_editable(task)
        attachment = self._get_attachment_or_404(task, attachment_id)
        object_path = attachment.storage_path
        task.attachments.remove(attachment)
        self._record(
            task,
            user,
            ACTION_ATTACHMENT_REMOVED,
            {"attachment_id": str(attachment_id), "filename": attachment.filename},
        )
        committed = self._commit(task)
        # O ARQUIVO SO SAI DO STORAGE DEPOIS QUE A REFERENCIA FOI REMOVIDA DO BANCO
        self._discard(object_path)
        return committed

    def attachment_file(
        self, task_id: uuid.UUID, attachment_id: uuid.UUID, viewer: User, *, can_review: bool
    ) -> TaskFileResponse:
        task = self.get_visible(task_id, viewer, can_review=can_review)
        attachment = self._get_attachment_or_404(task, attachment_id)
        return TaskFileResponse(
            url=attachments.signed_attachment_url(attachment.storage_path),
            expires_in=SIGNED_URL_EXPIRES_IN,
        )

    def submit(self, task_id: uuid.UUID, user: User) -> Task:
        task = self._get_assigned(task_id, user)
        if task.status == TaskStatus.IN_PROGRESS and not (task.execution_description or "").strip():
            raise HTTPException(
                status_code=422,
                detail="Descreva a execução antes de enviar a tarefa para análise.",
            )
        return self._transition(task, user, ACTION_SUBMITTED)

    def resume(self, task_id: uuid.UUID, user: User) -> Task:
        return self._transition(self._get_assigned(task_id, user), user, ACTION_RESUMED)

    def approve(self, task_id: uuid.UUID, reviewer: User) -> Task:
        task = self._get_or_404(task_id, for_update=True)
        task.reviewed_by_id = reviewer.id
        task.reviewed_at = datetime.now(UTC)
        return self._transition(task, reviewer, ACTION_APPROVED)

    def reject(self, task_id: uuid.UUID, reviewer: User, reason: str) -> Task:
        task = self._get_or_404(task_id, for_update=True)
        task.reviewed_by_id = reviewer.id
        task.reviewed_at = datetime.now(UTC)
        task.rejection_reason = reason
        return self._transition(task, reviewer, ACTION_REJECTED, {"reason": reason})

    def _transition(
        self, task: Task, actor: User, action: str, details: dict[str, Any] | None = None
    ) -> Task:
        previous = apply_transition(task, action)
        self._record(task, actor, action, details or {}, from_status=previous)
        return self._commit(task)

    def _record(
        self,
        task: Task,
        actor: User,
        action: str,
        details: dict[str, Any],
        *,
        from_status: TaskStatus | None = None,
    ) -> None:
        self.db.add(
            TaskHistory(
                task_id=task.id,
                actor_id=actor.id,
                action=action,
                from_status=from_status.value if from_status else None,
                to_status=task.status.value if from_status else None,
                details=details,
            )
        )

    def _commit(self, task: Task) -> Task:
        self.db.commit()
        self.db.refresh(task)
        return task

    def _get_or_404(self, task_id: uuid.UUID, *, for_update: bool = False) -> Task:
        statement = select(Task).where(Task.id == task_id)
        if for_update:
            statement = statement.with_for_update(of=Task)
        task = self.db.scalars(statement).unique().first()
        if task is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=TASK_NOT_FOUND)
        return task

    # SOMENTE O FUNCIONARIO RESPONSAVEL EXECUTA A TAREFA; PARA OS DEMAIS ELA NAO EXISTE
    def _get_assigned(self, task_id: uuid.UUID, user: User) -> Task:
        task = self._get_or_404(task_id, for_update=True)
        if task.assignee_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=TASK_NOT_FOUND)
        return task

    @staticmethod
    def _get_attachment_or_404(task: Task, attachment_id: uuid.UUID) -> TaskAttachment:
        attachment = next((item for item in task.attachments if item.id == attachment_id), None)
        if attachment is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Anexo não encontrado"
            )
        return attachment

    @staticmethod
    def _discard(object_path: str) -> None:
        try:
            attachments.delete_attachment(object_path)
        except Exception:
            logger.exception("Não foi possível remover o anexo %s do storage", object_path)
