import uuid
from datetime import date

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.modules.auth.models.user import User
from app.modules.tasks.models.task import Task, TaskStatus
from app.modules.tasks.models.task_execution_audit import TaskExecutionAudit
from app.modules.tasks.models.task_history import TaskHistory
from app.modules.tasks.models.task_proposal import TaskProposalStatus
from app.modules.tasks.schemas.task import TaskCreate
from app.modules.tasks.services.task_service import TaskService


def add_user(db, *, role: str = "admin", is_active: bool = True) -> User:
    user = User(
        id=uuid.uuid4(),
        email=f"{role}-{uuid.uuid4()}@example.com",
        password_hash="hash",
        role=role,
        is_active=is_active,
    )
    db.add(user)
    return user


def add_employee(db, *, is_active: bool = True) -> User:
    return add_user(db, role="interno", is_active=is_active)


def test_task_create_requires_description_and_assignee() -> None:
    with pytest.raises(ValidationError):
        TaskCreate(description="", idempotency_key="key")  # type: ignore[call-arg]


def test_task_create_accepts_a_single_assignee_only() -> None:
    with pytest.raises(ValidationError):
        TaskCreate(
            description="Revisar",
            assignee_id=[uuid.uuid4(), uuid.uuid4()],  # type: ignore[arg-type]
            idempotency_key="many-assignees",
        )


def test_create_task_persists_assignee_requester_status_and_audit(isolated_db_session) -> None:
    db = isolated_db_session
    user = add_user(db)
    employee = add_employee(db)
    db.flush()
    payload = TaskCreate(
        description="Organizar contratos",
        due_date=date(2026, 12, 1),
        assignee_id=employee.id,
        idempotency_key="task-request-1",
    )

    created = TaskService(db).create(payload, requester=user)

    assert created.status == TaskStatus.PENDING
    assert created.requester_id == user.id
    assert created.assignee_id == employee.id
    assert created.due_date == date(2026, 12, 1)
    audit = db.query(TaskExecutionAudit).filter_by(task_id=created.id).one()
    assert audit.requester_id == user.id
    assert audit.idempotency_key == "task-request-1"
    assert audit.result == "created"
    history = db.query(TaskHistory).filter_by(task_id=created.id).one()
    assert history.action == "created"
    assert history.actor_id == user.id
    assert history.to_status == TaskStatus.PENDING.value


def test_create_task_allows_missing_deadline(isolated_db_session) -> None:
    db = isolated_db_session
    user = add_user(db)
    employee = add_employee(db)
    db.flush()

    created = TaskService(db).create(
        TaskCreate(
            description="Revisar planilha",
            assignee_id=employee.id,
            idempotency_key="no-deadline",
        ),
        requester=user,
    )

    assert created.due_date is None


@pytest.mark.parametrize("case", ["inactive", "translator", "missing"])
def test_create_task_rejects_assignee_that_is_not_an_active_employee(
    isolated_db_session, case
) -> None:
    db = isolated_db_session
    user = add_user(db)
    assignee_id = uuid.uuid4()
    if case == "inactive":
        assignee_id = add_employee(db, is_active=False).id
    elif case == "translator":
        assignee_id = add_user(db, role="tradutor").id
    db.flush()

    with pytest.raises(HTTPException) as exc_info:
        TaskService(db).create(
            TaskCreate(
                description="Organizar arquivos",
                assignee_id=assignee_id,
                idempotency_key="invalid-assignee",
            ),
            requester=user,
        )

    assert exc_info.value.status_code == 422
    assert db.query(Task).count() == 0


def test_create_task_is_idempotent_per_requester_and_key(isolated_db_session) -> None:
    db = isolated_db_session
    user = add_user(db)
    employee = add_employee(db)
    db.flush()
    service = TaskService(db)
    first_payload = TaskCreate(
        description="Organizar contratos",
        assignee_id=employee.id,
        idempotency_key="same-request",
    )

    first = service.create(first_payload, requester=user)
    repeated = service.create(first_payload, requester=user)

    assert repeated.id == first.id
    assert db.query(Task).count() == 1
    assert db.query(TaskExecutionAudit).count() == 2
    assert {audit.result for audit in db.query(TaskExecutionAudit).all()} == {
        "created",
        "idempotent_replay",
    }


def test_idempotency_key_is_scoped_to_requester(isolated_db_session) -> None:
    db = isolated_db_session
    requester_a = add_user(db)
    requester_b = add_user(db)
    employee = add_employee(db)
    db.flush()
    service = TaskService(db)

    task_a = service.create(
        TaskCreate(
            description="Solicitação A",
            assignee_id=employee.id,
            idempotency_key="shared-key",
        ),
        requester=requester_a,
    )
    task_b = service.create(
        TaskCreate(
            description="Solicitação B",
            assignee_id=employee.id,
            idempotency_key="shared-key",
        ),
        requester=requester_b,
    )

    assert task_a.id != task_b.id


def test_reusing_idempotency_key_with_different_assignee_is_rejected(isolated_db_session) -> None:
    db = isolated_db_session
    user = add_user(db)
    employee = add_employee(db)
    other_employee = add_employee(db)
    db.flush()
    service = TaskService(db)
    service.create(
        TaskCreate(
            description="Original",
            assignee_id=employee.id,
            idempotency_key="conflict-key",
        ),
        requester=user,
    )

    with pytest.raises(HTTPException) as exc_info:
        service.create(
            TaskCreate(
                description="Original",
                assignee_id=other_employee.id,
                idempotency_key="conflict-key",
            ),
            requester=user,
        )

    assert exc_info.value.status_code == 409
    assert "idempotency_conflict" in {audit.result for audit in db.query(TaskExecutionAudit).all()}


def test_invalid_assignee_attempt_is_audited(isolated_db_session) -> None:
    db = isolated_db_session
    user = add_user(db)
    inactive = add_employee(db, is_active=False)
    db.flush()

    with pytest.raises(HTTPException):
        TaskService(db).create(
            TaskCreate(
                description="Organizar arquivos",
                assignee_id=inactive.id,
                idempotency_key="inactive-employee",
            ),
            requester=user,
        )

    audit = db.query(TaskExecutionAudit).one()
    assert audit.task_id is None
    assert audit.requester_id == user.id
    assert audit.result == "validation_failed"


def test_propose_task_persists_unpredictable_token_and_payload_hash(isolated_db_session) -> None:
    db = isolated_db_session
    user = add_user(db)
    employee = add_employee(db)
    db.flush()
    data = TaskCreate(
        description="Proposta segura",
        assignee_id=employee.id,
        idempotency_key="proposal-key",
    )

    proposal, token = TaskService(db).propose(data, requester=user)

    assert token
    assert proposal.requester_id == user.id
    assert proposal.payload_hash
    assert proposal.payload_hash != token
    assert proposal.status == TaskProposalStatus.PENDING
    assert proposal.task_id is None


def test_confirm_task_proposal_creates_and_consumes_atomically(isolated_db_session) -> None:
    db = isolated_db_session
    user = add_user(db)
    employee = add_employee(db)
    db.flush()
    service = TaskService(db)
    data = TaskCreate(
        description="Proposta confirmada",
        assignee_id=employee.id,
        idempotency_key="proposal-confirm-key",
    )
    proposal, token = service.propose(data, requester=user)

    created = service.confirm_proposal(token, data, requester=user)

    db.refresh(proposal)
    assert created.requester_id == user.id
    assert created.assignee_id == employee.id
    assert proposal.status == TaskProposalStatus.CONSUMED
    assert proposal.task_id == created.id
    assert db.query(TaskHistory).filter_by(task_id=created.id, action="created").count() == 1


def test_confirming_duplicate_proposals_is_idempotent(isolated_db_session) -> None:
    db = isolated_db_session
    user = add_user(db)
    employee = add_employee(db)
    db.flush()
    data = TaskCreate(
        description="Solicitação repetida",
        assignee_id=employee.id,
        idempotency_key="same-payload-key",
    )
    service = TaskService(db)
    first_proposal, first_token = service.propose(data, requester=user)
    second_proposal, second_token = service.propose(data, requester=user)

    first = service.confirm_proposal(first_token, data, requester=user)
    second = service.confirm_proposal(second_token, data, requester=user)

    assert second.id == first.id
    assert db.query(Task).count() == 1
    assert first_proposal.id != second_proposal.id


@pytest.mark.parametrize("case", ["unknown_token", "other_requester", "changed_payload"])
def test_invalid_proposal_confirmation_never_creates_task(isolated_db_session, case) -> None:
    db = isolated_db_session
    requester = add_user(db)
    other_requester = add_user(db)
    employee = add_employee(db)
    db.flush()
    service = TaskService(db)
    original = TaskCreate(
        description="Payload aprovado",
        assignee_id=employee.id,
        idempotency_key="approved-payload",
    )
    proposal, token = service.propose(original, requester=requester)
    confirmed_data = original
    supplied_token = token
    confirmed_requester = requester
    if case == "unknown_token":
        supplied_token = "unissued-token"
    elif case == "other_requester":
        confirmed_requester = other_requester
    else:
        confirmed_data = original.model_copy(update={"description": "Payload alterado"})

    with pytest.raises(HTTPException):
        service.confirm_proposal(supplied_token, confirmed_data, requester=confirmed_requester)

    assert db.query(Task).count() == 0
    db.refresh(proposal)
    assert proposal.status == TaskProposalStatus.PENDING


def test_reusing_consumed_token_with_changed_payload_never_creates_second_task(
    isolated_db_session,
) -> None:
    db = isolated_db_session
    user = add_user(db)
    employee = add_employee(db)
    db.flush()
    service = TaskService(db)
    original = TaskCreate(
        description="Uma tarefa",
        assignee_id=employee.id,
        idempotency_key="single-task-proposal",
    )
    _, token = service.propose(original, requester=user)
    created = service.confirm_proposal(token, original, requester=user)

    with pytest.raises(HTTPException):
        service.confirm_proposal(
            token,
            original.model_copy(update={"description": "Outra tarefa"}),
            requester=user,
        )

    assert db.query(Task).count() == 1
    assert db.query(Task).one().id == created.id
