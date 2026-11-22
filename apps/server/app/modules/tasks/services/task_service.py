import hashlib
import json
import secrets
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.tasks.models.task import Task, TaskStatus
from app.modules.tasks.models.task_execution_audit import TaskExecutionAudit
from app.modules.tasks.models.task_history import TaskHistory
from app.modules.tasks.models.task_proposal import TaskProposal, TaskProposalStatus
from app.modules.tasks.schemas.task import TaskCreate, TaskCreateRequest
from app.modules.tasks.services.task_rules import ACTION_CREATED, load_assignee
from app.modules.translators.models.translator import Translator
from app.shared.google_adk.tool_catalog.contract import Usuario

INVALID_ASSIGNEE = "O responsável deve ser um funcionário interno ativo"


class TaskService:
    def __init__(self, db: Session):
        self.db = db

    def create(self, data: TaskCreate, *, requester: Usuario) -> Task:
        existing = (
            self.db.query(Task)
            .filter(
                Task.requester_id == requester.id,
                Task.idempotency_key == data.idempotency_key,
            )
            .first()
        )
        if existing:
            self._record_existing_attempt(existing, data, requester)
            return existing

        translators = (
            self.db.query(Translator)
            .filter(Translator.id.in_(data.translator_ids), Translator.is_active.is_(True))
            .all()
        )
        if len(translators) != len(data.translator_ids):
            self._record_audit(
                task_id=None,
                data=data,
                requester=requester,
                result="validation_failed",
                details=self._details(data),
                commit=True,
            )
            raise HTTPException(
                status_code=422, detail="One or more translators are missing or inactive"
            )

        task = Task(
            description=data.description,
            due_date=data.due_date,
            status=TaskStatus.PENDING,
            requester_id=requester.id,
            idempotency_key=data.idempotency_key,
            translators=translators,
        )
        self.db.add(task)
        try:
            self.db.flush()
            self._record_audit(
                task_id=task.id,
                data=data,
                requester=requester,
                result="created",
                details=self._details(data),
            )
            self.db.commit()
            self.db.refresh(task)
            return task
        except IntegrityError:
            self.db.rollback()
            existing = (
                self.db.query(Task)
                .filter(
                    Task.requester_id == requester.id,
                    Task.idempotency_key == data.idempotency_key,
                )
                .first()
            )
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

    def propose_for_assignee(
        self, data: TaskCreateRequest, *, requester: Usuario
    ) -> tuple[TaskProposal, str]:
        token = secrets.token_urlsafe(32)
        proposal = TaskProposal(
            token_hash=self._token_hash(token),
            requester_id=requester.id,
            payload_hash=self._assignee_payload_hash(data),
            status=TaskProposalStatus.PENDING,
        )
        self.db.add(proposal)
        self.db.flush()
        key = str(proposal.id)
        self._add_audit(
            None,
            requester,
            key,
            "confirmation_required",
            self._assignee_details(data),
        )
        self.db.commit()
        self.db.refresh(proposal)
        return proposal, token

    def confirm_assignee_proposal(
        self, token: str, data: TaskCreateRequest, *, requester: Usuario
    ) -> Task:
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
            or proposal.payload_hash != self._assignee_payload_hash(data)
        ):
            raise HTTPException(status_code=409, detail="Task proposal is invalid or already used")

        key = str(proposal.id)
        task = self.create_for_assignee(
            data.model_copy(update={"idempotency_key": key}), requester=requester
        )
        proposal.status = TaskProposalStatus.CONSUMED
        proposal.task_id = task.id
        self._add_audit(
            task.id,
            requester,
            key,
            "proposal_consumed",
            {"proposal_id": str(proposal.id), "payload_hash": proposal.payload_hash},
        )
        self.db.commit()
        return task

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

        task_data = data
        translators = (
            self.db.query(Translator)
            .filter(Translator.id.in_(task_data.translator_ids), Translator.is_active.is_(True))
            .with_for_update()
            .all()
        )
        if len(translators) != len(task_data.translator_ids):
            self._record_audit(
                task_id=None,
                data=task_data,
                requester=requester,
                result="validation_failed",
                details=self._details(task_data),
            )
            self.db.commit()
            raise HTTPException(
                status_code=422, detail="One or more translators are missing or inactive"
            )

        existing = (
            self.db.query(Task)
            .filter(
                Task.requester_id == requester.id,
                Task.idempotency_key == task_data.idempotency_key,
            )
            .first()
        )
        if existing:
            proposal.status = TaskProposalStatus.CONSUMED
            proposal.task_id = existing.id
            self._record_audit(
                task_id=existing.id,
                data=task_data,
                requester=requester,
                result="idempotent_replay",
                details={"proposal_id": str(proposal.id)},
            )
            self.db.commit()
            self.db.refresh(existing)
            return existing

        task = Task(
            description=task_data.description,
            due_date=task_data.due_date,
            status=TaskStatus.PENDING,
            requester_id=requester.id,
            idempotency_key=task_data.idempotency_key,
            translators=translators,
        )
        self.db.add(task)
        self.db.flush()
        self._record_audit(
            task_id=task.id,
            data=task_data,
            requester=requester,
            result="created",
            details=self._details(task_data),
        )
        proposal.status = TaskProposalStatus.CONSUMED
        proposal.task_id = task.id
        self._record_audit(
            task_id=task.id,
            data=task_data,
            requester=requester,
            result="proposal_consumed",
            details={"proposal_id": str(proposal.id), "payload_hash": proposal.payload_hash},
        )
        self.db.commit()
        self.db.refresh(task)
        return task

    # CRIACAO PARA EXATAMENTE UM FUNCIONARIO INTERNO (ENDPOINT). REAPROVEITA A TABELA, A
    # AUDITORIA E A IDEMPOTENCIA DO FLUXO DO AGENTE, QUE CONTINUA ATRIBUINDO A TRADUTORES
    def create_for_assignee(self, data: TaskCreateRequest, *, requester: Usuario) -> Task:
        key = data.idempotency_key or str(uuid4())
        details = self._assignee_details(data)

        existing = self._find_by_key(requester, key)
        if existing is not None:
            return self._replay_assignee_request(existing, data, requester, key)

        if load_assignee(self.db, data.assignee_id) is None:
            self._add_audit(None, requester, key, "validation_failed", details)
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
            existing = self._find_by_key(requester, key)
            if existing is None:
                raise
            return self._replay_assignee_request(existing, data, requester, key)

        self._add_audit(task.id, requester, key, "created", details)
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

    @staticmethod
    def _payload_hash(data: TaskCreate) -> str:
        payload = {
            "description": data.description.strip(),
            "due_date": data.due_date.isoformat() if data.due_date else None,
            "translator_ids": sorted(str(translator_id) for translator_id in data.translator_ids),
        }
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical.encode()).hexdigest()

    @staticmethod
    def _assignee_payload_hash(data: TaskCreateRequest) -> str:
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
        existing_translator_ids = {translator.id for translator in existing.translators}
        if (
            existing.description != data.description
            or existing.due_date != data.due_date
            or existing_translator_ids != set(data.translator_ids)
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
            "translator_ids": [str(translator_id) for translator_id in data.translator_ids],
        }

    def _find_by_key(self, requester: Usuario, key: str) -> Task | None:
        return (
            self.db.query(Task)
            .filter(Task.requester_id == requester.id, Task.idempotency_key == key)
            .first()
        )

    # A MESMA CHAVE COM OS MESMOS DADOS DEVOLVE A TAREFA JA CRIADA; COM OUTROS DADOS, E RECUSADA
    def _replay_assignee_request(
        self, existing: Task, data: TaskCreateRequest, requester: Usuario, key: str
    ) -> Task:
        details = self._assignee_details(data)
        if (
            existing.description != data.description
            or existing.due_date != data.due_date
            or existing.assignee_id != data.assignee_id
        ):
            self._add_audit(existing.id, requester, key, "idempotency_conflict", details)
            self.db.commit()
            raise HTTPException(
                status_code=409, detail="Idempotency key already used with other data"
            )
        self._add_audit(existing.id, requester, key, "idempotent_replay", details)
        self.db.commit()
        return existing

    def _add_audit(
        self,
        task_id: UUID | None,
        requester: Usuario,
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
    def _assignee_details(data: TaskCreateRequest) -> dict[str, object]:
        return {
            "description": data.description,
            "due_date": data.due_date.isoformat() if data.due_date else None,
            "assignee_id": str(data.assignee_id),
        }
