import uuid

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.auth.models.user import User
from app.modules.tasks.models.task import Task, TaskStatus
from app.modules.tasks.models.task_execution_audit import TaskExecutionAudit
from app.modules.tasks.models.task_history import TaskHistory
from app.modules.tasks.schemas.task import TaskCreateRequest
from app.modules.tasks.services.task_rules import ACTION_CREATED, load_assignee

INVALID_ASSIGNEE = "O responsável deve ser um funcionário interno ativo"


# CRIACAO PELO ENDPOINT: REAPROVEITA A TABELA DE TAREFAS, A AUDITORIA E A IDEMPOTENCIA
# DO FLUXO DO AGENTE, MAS ATRIBUI A TAREFA A EXATAMENTE UM FUNCIONARIO INTERNO
class TaskAssignmentService:
    def __init__(self, db: Session):
        self.db = db

    def create(self, data: TaskCreateRequest, *, requester: User) -> Task:
        key = data.idempotency_key or str(uuid.uuid4())
        details = self._details(data)

        existing = self._find_existing(requester, key)
        if existing is not None:
            return self._replay(existing, data, requester, key)

        if load_assignee(self.db, data.assignee_id) is None:
            self._audit(None, requester, key, "validation_failed", details)
            self.db.commit()
            raise HTTPException(status_code=422, detail=INVALID_ASSIGNEE)

        task = Task(
            description=data.description,
            due_date=data.due_date,
            status=TaskStatus.PENDING,
            requester_id=requester.id,
            assignee_id=data.assignee_id,
            idempotency_key=key,
        )
        self.db.add(task)
        try:
            self.db.flush()
        except IntegrityError:
            self.db.rollback()
            existing = self._find_existing(requester, key)
            if existing is None:
                raise
            return self._replay(existing, data, requester, key)

        self._audit(task.id, requester, key, "created", details)
        self.db.add(
            TaskHistory(
                task_id=task.id,
                actor_id=requester.id,
                action=ACTION_CREATED,
                from_status=None,
                to_status=TaskStatus.PENDING.value,
                details=details,
            )
        )
        self.db.commit()
        self.db.refresh(task)
        return task

    def _find_existing(self, requester: User, key: str) -> Task | None:
        return (
            self.db.query(Task)
            .filter(Task.requester_id == requester.id, Task.idempotency_key == key)
            .first()
        )

    # A MESMA CHAVE COM OS MESMOS DADOS DEVOLVE A TAREFA JA CRIADA; COM OUTROS DADOS, E RECUSADA
    def _replay(self, existing: Task, data: TaskCreateRequest, requester: User, key: str) -> Task:
        details = self._details(data)
        if (
            existing.description != data.description
            or existing.due_date != data.due_date
            or existing.assignee_id != data.assignee_id
        ):
            self._audit(existing.id, requester, key, "idempotency_conflict", details)
            self.db.commit()
            raise HTTPException(
                status_code=409, detail="Idempotency key already used with other data"
            )
        self._audit(existing.id, requester, key, "idempotent_replay", details)
        self.db.commit()
        return existing

    def _audit(
        self,
        task_id: uuid.UUID | None,
        requester: User,
        key: str,
        result: str,
        details: dict[str, object],
    ) -> None:
        self.db.add(
            TaskExecutionAudit(
                task_id=task_id,
                requester_id=requester.id,
                idempotency_key=key,
                result=result,
                details=details,
            )
        )

    @staticmethod
    def _details(data: TaskCreateRequest) -> dict[str, object]:
        return {
            "description": data.description,
            "due_date": data.due_date.isoformat() if data.due_date else None,
            "assignee_id": str(data.assignee_id),
        }
