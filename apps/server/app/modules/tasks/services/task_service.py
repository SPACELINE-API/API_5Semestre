import hashlib
import json
import secrets
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.auth.models.user import User
from app.modules.tasks.models.task import Task, TaskStatus
from app.modules.tasks.models.task_execution_audit import TaskExecutionAudit
from app.modules.tasks.models.task_history import TaskHistory
from app.modules.tasks.models.task_proposal import TaskProposal, TaskProposalStatus
from app.modules.tasks.schemas.task import TaskCreate
from app.modules.tasks.services.task_rules import ACTION_CREATED, load_assignee
from app.shared.google_adk.tool_catalog.contract import Usuario

INVALID_ASSIGNEE = "O responsável deve ser um funcionário interno ativo"


class TaskService:
    def __init__(self, db: Session):
        self.db = db

    def create(self, data: TaskCreate, *, requester: Usuario) -> Task:
        existing = self._find_existing(data, requester)
        if existing:
            self._record_existing_attempt(existing, data, requester)
            return existing

        assignee = load_assignee(self.db, data.assignee_id)
        if assignee is None:
            self._record_audit(
                task_id=None,
                data=data,
                requester=requester,
                result="validation_failed",
                details=self._details(data),
                commit=True,
            )
            raise HTTPException(status_code=422, detail=INVALID_ASSIGNEE)

        task = self._new_task(data, requester, assignee)
        try:
            self.db.flush()
            self._record_creation(task, data, requester)
            self.db.commit()
            self.db.refresh(task)
            return task
        except IntegrityError:
            self.db.rollback()
            existing = self._find_existing(data, requester)
            if existing:
                self._record_existing_attempt(existing, data, requester)
                return existing
            raise

    def propose(self, data: TaskCreate, *, requester: Usuario) -> tuple[TaskProposal, str]:
        token = secrets.token_urlsafe(32)
        proposal = TaskProposal(
            token_hash=self._token_hash(token),
            requester_id=requester.id,
            payload_hash=self._payload_hash(data),
            status=TaskProposalStatus.PENDING,
        )
        self.db.add(proposal)
        self.db.flush()
        proposal_key = str(proposal.id)
        self._record_audit(
            task_id=None,
            data=data.model_copy(update={"idempotency_key": proposal_key}),
            requester=requester,
            result="confirmation_required",
            details={"payload_hash": proposal.payload_hash},
        )
        self.db.commit()
        self.db.refresh(proposal)
        return proposal, token

    def confirm_proposal(self, token: str, data: TaskCreate, *, requester: Usuario) -> Task:
        proposal = (
            self.db.query(TaskProposal)
            .filter(
                TaskProposal.token_hash == self._token_hash(token),
                TaskProposal.requester_id == requester.id,
            )
            .with_for_update()
            .first()
        )
        if (
            proposal is None
            or proposal.status != TaskProposalStatus.PENDING
            or proposal.payload_hash != self._payload_hash(data)
        ):
            raise HTTPException(status_code=409, detail="Task proposal is invalid or already used")

        assignee = load_assignee(self.db, data.assignee_id)
        if assignee is None:
            self._record_audit(
                task_id=None,
                data=data,
                requester=requester,
                result="validation_failed",
                details=self._details(data),
            )
            self.db.commit()
            raise HTTPException(status_code=422, detail=INVALID_ASSIGNEE)

        existing = self._find_existing(data, requester)
        if existing:
            proposal.status = TaskProposalStatus.CONSUMED
            proposal.task_id = existing.id
            self._record_audit(
                task_id=existing.id,
                data=data,
                requester=requester,
                result="idempotent_replay",
                details={"proposal_id": str(proposal.id)},
            )
            self.db.commit()
            self.db.refresh(existing)
            return existing

        task = self._new_task(data, requester, assignee)
        self.db.flush()
        self._record_creation(task, data, requester)
        proposal.status = TaskProposalStatus.CONSUMED
        proposal.task_id = task.id
        self._record_audit(
            task_id=task.id,
            data=data,
            requester=requester,
            result="proposal_consumed",
            details={"proposal_id": str(proposal.id), "payload_hash": proposal.payload_hash},
        )
        self.db.commit()
        self.db.refresh(task)
        return task

    def _find_existing(self, data: TaskCreate, requester: Usuario) -> Task | None:
        return (
            self.db.query(Task)
            .filter(
                Task.requester_id == requester.id,
                Task.idempotency_key == data.idempotency_key,
            )
            .first()
        )

    def _new_task(self, data: TaskCreate, requester: Usuario, assignee: User) -> Task:
        task = Task(
            description=data.description,
            due_date=data.due_date,
            status=TaskStatus.PENDING,
            requester_id=requester.id,
            assignee_id=assignee.id,
            idempotency_key=data.idempotency_key,
        )
        self.db.add(task)
        return task

    def _record_creation(self, task: Task, data: TaskCreate, requester: Usuario) -> None:
        self._record_audit(
            task_id=task.id,
            data=data,
            requester=requester,
            result="created",
            details=self._details(data),
        )
        self.db.add(
            TaskHistory(
                task_id=task.id,
                actor_id=requester.id,
                action=ACTION_CREATED,
                from_status=None,
                to_status=TaskStatus.PENDING.value,
                details=self._details(data),
            )
        )

    @staticmethod
    def _payload_hash(data: TaskCreate) -> str:
        payload = {
            "description": data.description.strip(),
            "due_date": data.due_date.isoformat() if data.due_date else None,
            "assignee_id": str(data.assignee_id),
        }
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical.encode()).hexdigest()

    @staticmethod
    def _token_hash(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def record_attempt(
        self,
        data: TaskCreate,
        *,
        requester: Usuario,
        result: str,
        details: dict[str, object],
    ) -> None:
        self._record_audit(
            task_id=None,
            data=data,
            requester=requester,
            result=result,
            details=details,
            commit=True,
        )

    def _record_existing_attempt(
        self, existing: Task, data: TaskCreate, requester: Usuario
    ) -> None:
        if (
            existing.description != data.description
            or existing.due_date != data.due_date
            or existing.assignee_id != data.assignee_id
        ):
            self._record_audit(
                task_id=existing.id,
                data=data,
                requester=requester,
                result="idempotency_conflict",
                details=self._details(data),
                commit=True,
            )
            raise HTTPException(
                status_code=409, detail="Idempotency key already used with other data"
            )
        self._record_audit(
            task_id=existing.id,
            data=data,
            requester=requester,
            result="idempotent_replay",
            details=self._details(data),
            commit=True,
        )

    def _record_audit(
        self,
        *,
        task_id: UUID | None,
        data: TaskCreate,
        requester: Usuario,
        result: str,
        details: dict[str, object],
        commit: bool = False,
    ) -> None:
        self.db.add(
            TaskExecutionAudit(
                task_id=task_id,
                requester_id=requester.id,
                idempotency_key=data.idempotency_key,
                result=result,
                details=details,
            )
        )
        if commit:
            self.db.commit()

    @staticmethod
    def _details(data: TaskCreate) -> dict[str, object]:
        return {
            "description": data.description,
            "due_date": data.due_date.isoformat() if data.due_date else None,
            "assignee_id": str(data.assignee_id),
        }
