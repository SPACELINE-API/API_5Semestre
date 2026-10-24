import asyncio
import uuid
from datetime import date

from app.modules.auth.models.roles import Permission, Role
from app.modules.auth.models.user import User
from app.modules.tasks.models.task import Task
from app.modules.tasks.models.task_proposal import TaskProposal, TaskProposalStatus
from app.shared.google_adk.tool_catalog import Executor
from app.shared.google_adk.tool_catalog.catalogo_tarefas import criar_catalogo_tarefas
from app.shared.google_adk.tool_catalog.tools import tarefas as toolset


async def approve_guardrail(*_args):
    return None


def run(executor, params, user):
    return asyncio.run(executor.executar("criar_tarefa", params, user))


def add_user(db, role="admin"):
    permission = db.query(Permission).filter_by(code="assignments.write").first()
    if permission is None:
        permission = Permission(code="assignments.write")
        db.add(permission)
    access_role = Role(name=f"{role}-{uuid.uuid4()}", permissions=[permission])
    db.add(access_role)
    user = User(
        id=uuid.uuid4(),
        email=f"{role}-{uuid.uuid4()}@example.com",
        password_hash="hash",
        role=role,
        roles=[access_role],
    )
    db.add(user)
    return user


def keep_loaded_instances(db):
    db.expire_on_commit = False


def add_translator(db):
    from app.modules.translators.models.translator import Translator

    translator = Translator(
        id=uuid.uuid4(),
        name="Ana Tradutora",
        email=f"translator-{uuid.uuid4()}@example.com",
        phone="11999990000",
        is_active=True,
    )
    db.add(translator)
    return translator


def test_task_tool_returns_persisted_proposal_without_creating_task(isolated_db_session, monkeypatch):
    db = isolated_db_session
    keep_loaded_instances(db)
    user = add_user(db)
    translator = add_translator(db)
    db.flush()
    monkeypatch.setattr(toolset, "get_session_factory", lambda: lambda: db)

    result = run(
        Executor(criar_catalogo_tarefas(), approve_guardrail),
        {
            "description": "Traduzir contrato",
            "translator_ids": [str(translator.id)],
            "due_date": date(2026, 12, 1).isoformat(),
        },
        user,
    )

    assert result.sucesso is True
    assert result.dados["status"] == "confirmation_required"
    assert result.dados["confirmation_token"]
    assert "Traduzir contrato" in result.dados["mensagem"]
    assert db.query(Task).count() == 0
    proposal = db.query(TaskProposal).one()
    assert proposal.requester_id == user.id
    assert proposal.status == TaskProposalStatus.PENDING


def test_task_tool_creates_only_with_matching_proposal_token(isolated_db_session, monkeypatch):
    db = isolated_db_session
    keep_loaded_instances(db)
    user = add_user(db)
    translator = add_translator(db)
    db.flush()
    monkeypatch.setattr(toolset, "get_session_factory", lambda: lambda: db)
    executor = Executor(criar_catalogo_tarefas(), approve_guardrail)
    payload = {
        "description": "Traduzir contrato",
        "translator_ids": [str(translator.id)],
        "due_date": date(2026, 12, 1).isoformat(),
    }
    proposal_result = run(executor, payload, user)

    confirmation_result = run(
        executor,
        {**payload, "confirmation_token": proposal_result.dados["confirmation_token"]},
        user,
    )

    assert confirmation_result.sucesso is True
    assert confirmation_result.dados["status"] == "created"
    assert confirmation_result.dados["task_id"]
    assert db.query(Task).count() == 1
    assert db.query(TaskProposal).one().status == TaskProposalStatus.CONSUMED


def test_task_tool_rejects_boolean_confirmation_without_creating_task(
    isolated_db_session, monkeypatch
):
    db = isolated_db_session
    keep_loaded_instances(db)
    user = add_user(db)
    translator = add_translator(db)
    db.flush()
    monkeypatch.setattr(toolset, "get_session_factory", lambda: lambda: db)

    result = run(
        Executor(criar_catalogo_tarefas(), approve_guardrail),
        {
            "description": "Traduzir contrato",
            "translator_ids": [str(translator.id)],
            "due_date": date(2026, 12, 1).isoformat(),
            "confirmado": True,
        },
        user,
    )

    assert result.sucesso is False
    assert db.query(Task).count() == 0
    assert db.query(TaskProposal).count() == 0


def test_task_tool_changed_payload_and_wrong_user_token_do_not_create_task(
    isolated_db_session, monkeypatch
):
    db = isolated_db_session
    keep_loaded_instances(db)
    user = add_user(db)
    other_user = add_user(db)
    translator = add_translator(db)
    db.flush()
    monkeypatch.setattr(toolset, "get_session_factory", lambda: lambda: db)
    executor = Executor(criar_catalogo_tarefas(), approve_guardrail)
    payload = {
        "description": "Traduzir contrato",
        "translator_ids": [str(translator.id)],
        "due_date": date(2026, 12, 1).isoformat(),
    }
    proposal_result = run(executor, payload, user)
    token = proposal_result.dados["confirmation_token"]

    changed_result = run(
        executor,
        {**payload, "description": "Outra tarefa", "confirmation_token": token},
        user,
    )
    other_user_result = run(
        executor,
        {**payload, "confirmation_token": token},
        other_user,
    )

    assert changed_result.sucesso is False
    assert other_user_result.sucesso is False
    assert db.query(Task).count() == 0
    assert db.query(TaskProposal).one().status == TaskProposalStatus.PENDING


def test_task_tool_consumed_token_cannot_create_task_again(isolated_db_session, monkeypatch):
    db = isolated_db_session
    keep_loaded_instances(db)
    user = add_user(db)
    translator = add_translator(db)
    db.flush()
    monkeypatch.setattr(toolset, "get_session_factory", lambda: lambda: db)
    executor = Executor(criar_catalogo_tarefas(), approve_guardrail)
    payload = {
        "description": "Traduzir contrato",
        "translator_ids": [str(translator.id)],
        "due_date": date(2026, 12, 1).isoformat(),
    }
    proposal_result = run(executor, payload, user)
    token = proposal_result.dados["confirmation_token"]
    first_confirmation = run(executor, {**payload, "confirmation_token": token}, user)
    second_confirmation = run(executor, {**payload, "confirmation_token": token}, user)

    assert first_confirmation.sucesso is True
    assert second_confirmation.sucesso is False
    assert db.query(Task).count() == 1
