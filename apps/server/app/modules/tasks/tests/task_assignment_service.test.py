import uuid
from datetime import date

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.modules.auth.models.user import User
from app.modules.tasks.models.task import Task, TaskStatus
from app.modules.tasks.models.task_execution_audit import TaskExecutionAudit
from app.modules.tasks.models.task_history import TaskHistory
from app.modules.tasks.schemas.task import TaskCreateRequest
from app.modules.tasks.services.task_assignment_service import TaskAssignmentService


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


def request(assignee_id: uuid.UUID, **overrides) -> TaskCreateRequest:
    return TaskCreateRequest(
        description=overrides.pop("description", "Organizar contratos"),
        assignee_id=assignee_id,
        **overrides,
    )


def test_request_accepts_a_single_assignee_only() -> None:
    with pytest.raises(ValidationError):
        TaskCreateRequest(
            description="Revisar",
            assignee_id=[uuid.uuid4(), uuid.uuid4()],  # type: ignore[arg-type]
        )


def test_request_requires_description_and_assignee() -> None:
    with pytest.raises(ValidationError):
        TaskCreateRequest(description="   ", assignee_id=uuid.uuid4())
    with pytest.raises(ValidationError):
        TaskCreateRequest(description="Revisar")  # type: ignore[call-arg]


def test_create_persists_assignee_requester_status_audit_and_history(
    isolated_db_session,
) -> None:
    db = isolated_db_session
    requester = add_user(db)
    employee = add_employee(db)
    db.flush()

    created = TaskAssignmentService(db).create(
        request(employee.id, due_date=date(2026, 12, 1), idempotency_key="req-1"),
        requester=requester,
    )

    assert created.status == TaskStatus.PENDING
    assert created.requester_id == requester.id
    assert created.assignee_id == employee.id
    assert created.translators == []
    assert created.due_date == date(2026, 12, 1)
    audit = db.query(TaskExecutionAudit).filter_by(task_id=created.id).one()
    assert audit.result == "created"
    assert audit.idempotency_key == "req-1"
    history = db.query(TaskHistory).filter_by(task_id=created.id).one()
    assert history.action == "created"
    assert history.to_status == TaskStatus.PENDING.value


def test_create_without_key_always_creates_a_new_task(isolated_db_session) -> None:
    db = isolated_db_session
    requester = add_user(db)
    employee = add_employee(db)
    db.flush()
    service = TaskAssignmentService(db)

    first = service.create(request(employee.id), requester=requester)
    second = service.create(request(employee.id), requester=requester)

    assert first.id != second.id
    assert first.idempotency_key != second.idempotency_key


@pytest.mark.parametrize("case", ["inactive", "translator", "missing"])
def test_create_rejects_assignee_that_is_not_an_active_employee(isolated_db_session, case) -> None:
    db = isolated_db_session
    requester = add_user(db)
    assignee_id = uuid.uuid4()
    if case == "inactive":
        assignee_id = add_employee(db, is_active=False).id
    elif case == "translator":
        assignee_id = add_user(db, role="tradutor").id
    db.flush()

    with pytest.raises(HTTPException) as exc_info:
        TaskAssignmentService(db).create(request(assignee_id), requester=requester)

    assert exc_info.value.status_code == 422
    assert db.query(Task).count() == 0
    assert db.query(TaskExecutionAudit).one().result == "validation_failed"


def test_same_key_and_data_returns_the_existing_task(isolated_db_session) -> None:
    db = isolated_db_session
    requester = add_user(db)
    employee = add_employee(db)
    db.flush()
    service = TaskAssignmentService(db)
    payload = request(employee.id, idempotency_key="same-request")

    first = service.create(payload, requester=requester)
    repeated = service.create(payload, requester=requester)

    assert repeated.id == first.id
    assert db.query(Task).count() == 1
    assert {audit.result for audit in db.query(TaskExecutionAudit).all()} == {
        "created",
        "idempotent_replay",
    }


def test_same_key_with_other_assignee_is_rejected(isolated_db_session) -> None:
    db = isolated_db_session
    requester = add_user(db)
    employee = add_employee(db)
    other = add_employee(db)
    db.flush()
    service = TaskAssignmentService(db)
    service.create(request(employee.id, idempotency_key="conflict"), requester=requester)

    with pytest.raises(HTTPException) as exc_info:
        service.create(request(other.id, idempotency_key="conflict"), requester=requester)

    assert exc_info.value.status_code == 409
    assert db.query(Task).count() == 1
