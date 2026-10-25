import uuid
from datetime import date

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.modules.auth.models.user import User
from app.modules.tasks.models.task import Task, TaskStatus
from app.modules.tasks.models.task_execution_audit import TaskExecutionAudit
from app.modules.tasks.models.task_proposal import TaskProposalStatus
from app.modules.tasks.schemas.task import TaskCreate
from app.modules.tasks.services.task_service import TaskService
from app.modules.translators.models.translator import Translator


def add_user(db) -> User:
    user = User(
        id=uuid.uuid4(),
        email=f"requester-{uuid.uuid4()}@example.com",
        password_hash="hash",
        role="admin",
    )
    db.add(user)
    return user


def add_translator(db, *, is_active: bool = True) -> Translator:
    translator = Translator(
        id=uuid.uuid4(),
        name="Tradutor teste",
        email=f"translator-{uuid.uuid4()}@example.com",
        phone="11999990000",
        is_active=is_active,
    )
    db.add(translator)
    return translator


def test_task_create_requires_description_and_translators() -> None:
    with pytest.raises(ValidationError):
        TaskCreate(description="", translator_ids=[])


def test_task_create_rejects_duplicate_translators() -> None:
    translator_id = uuid.uuid4()
    with pytest.raises(ValidationError):
        TaskCreate(
            description="Revisar",
            translator_ids=[translator_id, translator_id],
            idempotency_key="duplicate-translator",
        )


def test_create_task_persists_assignees_requester_status_and_audit(isolated_db_session) -> None:
    db = isolated_db_session
    user = add_user(db)
    translator_a = add_translator(db)
    translator_b = add_translator(db)
    db.flush()
    payload = TaskCreate(
        description="Traduzir contrato",
        due_date=date(2026, 12, 1),
        translator_ids=[translator_a.id, translator_b.id],
        idempotency_key="task-request-1",
    )

    created = TaskService(db).create(payload, requester=user)

    assert created.status == TaskStatus.PENDING
    assert created.requester_id == user.id
    assert created.due_date == date(2026, 12, 1)
    assert {translator.id for translator in created.translators} == {
        translator_a.id,
        translator_b.id,
    }
    audit = db.query(TaskExecutionAudit).filter_by(task_id=created.id).one()
    assert audit.requester_id == user.id
    assert audit.idempotency_key == "task-request-1"
    assert audit.result == "created"


def test_create_task_allows_missing_deadline(isolated_db_session) -> None:
    db = isolated_db_session
    user = add_user(db)
    translator = add_translator(db)
    db.flush()

    created = TaskService(db).create(
        TaskCreate(
            description="Revisar tradução",
            translator_ids=[translator.id],
            idempotency_key="no-deadline",
        ),
        requester=user,
    )

    assert created.due_date is None


@pytest.mark.parametrize("active", [False, None])
def test_create_task_rejects_inactive_or_missing_translator(isolated_db_session, active) -> None:
    db = isolated_db_session
    user = add_user(db)
    translator_id = uuid.uuid4()
    if active is not None:
        translator = add_translator(db, is_active=active)
        translator_id = translator.id
    db.flush()

    with pytest.raises(HTTPException) as exc_info:
        TaskService(db).create(
            TaskCreate(
                description="Traduzir documento",
                translator_ids=[translator_id],
                idempotency_key="invalid-assignee",
            ),
            requester=user,
        )

    assert exc_info.value.status_code == 422
    assert db.query(Task).count() == 0


def test_create_task_is_idempotent_per_requester_and_key(isolated_db_session) -> None:
    db = isolated_db_session
    user = add_user(db)
    translator = add_translator(db)
    db.flush()
    service = TaskService(db)
    first_payload = TaskCreate(
        description="Traduzir documento",
        translator_ids=[translator.id],
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
    translator = add_translator(db)
    db.flush()
    service = TaskService(db)

    task_a = service.create(
        TaskCreate(
            description="Solicitação A",
            translator_ids=[translator.id],
            idempotency_key="shared-key",
        ),
        requester=requester_a,
    )
    task_b = service.create(
        TaskCreate(
            description="Solicitação B",
            translator_ids=[translator.id],
            idempotency_key="shared-key",
        ),
        requester=requester_b,
    )

    assert task_a.id != task_b.id


def test_reusing_idempotency_key_with_different_payload_is_rejected(isolated_db_session) -> None:
    db = isolated_db_session
    user = add_user(db)
    translator = add_translator(db)
    db.flush()
    service = TaskService(db)
    service.create(
        TaskCreate(
            description="Original",
            translator_ids=[translator.id],
            idempotency_key="conflict-key",
        ),
        requester=user,
    )

    with pytest.raises(HTTPException) as exc_info:
        service.create(
            TaskCreate(
                description="Alterada",
                translator_ids=[translator.id],
                idempotency_key="conflict-key",
            ),
            requester=user,
        )

    assert exc_info.value.status_code == 409
    assert "idempotency_conflict" in {audit.result for audit in db.query(TaskExecutionAudit).all()}


def test_invalid_translator_attempt_is_audited(isolated_db_session) -> None:
    db = isolated_db_session
    user = add_user(db)
    inactive = add_translator(db, is_active=False)
    db.flush()

    with pytest.raises(HTTPException):
        TaskService(db).create(
            TaskCreate(
                description="Traduzir documento",
                translator_ids=[inactive.id],
                idempotency_key="inactive-translator",
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
    translator = add_translator(db)
    db.flush()
    data = TaskCreate(
        description="Proposta segura",
        translator_ids=[translator.id],
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
    translator = add_translator(db)
    db.flush()
    service = TaskService(db)
    data = TaskCreate(
        description="Proposta confirmada",
        translator_ids=[translator.id],
        idempotency_key="proposal-confirm-key",
    )
    proposal, token = service.propose(data, requester=user)

    created = service.confirm_proposal(token, data, requester=user)

    db.refresh(proposal)
    assert created.requester_id == user.id
    assert proposal.status == TaskProposalStatus.CONSUMED
    assert proposal.task_id == created.id


def test_confirming_duplicate_proposals_is_idempotent(isolated_db_session) -> None:
    db = isolated_db_session
    user = add_user(db)
    translator = add_translator(db)
    db.flush()
    data = TaskCreate(
        description="Solicitação repetida",
        translator_ids=[translator.id],
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
    translator = add_translator(db)
    db.flush()
    service = TaskService(db)
    original = TaskCreate(
        description="Payload aprovado",
        translator_ids=[translator.id],
        idempotency_key="approved-payload",
    )
    proposal, token = service.propose(original, requester=requester)
    confirmed_data = original.model_copy(update={"description": "Payload alterado"})
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
    translator = add_translator(db)
    db.flush()
    service = TaskService(db)
    original = TaskCreate(
        description="Uma tarefa",
        translator_ids=[translator.id],
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
