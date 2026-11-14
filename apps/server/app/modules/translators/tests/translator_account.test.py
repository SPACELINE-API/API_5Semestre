import re
import uuid
from collections.abc import Iterator
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.auth.dependencies.dependencies import (
    get_current_user,
    get_supabase_admin_client,
)
from app.modules.auth.models.authorization_audit import AuthorizationAuditLog
from app.modules.auth.models.roles import Role
from app.modules.auth.models.user import User
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.internal_users.models.password_setup_token import PasswordSetupToken
from app.modules.internal_users.tests.conftest import FakeSupabaseAdminClient
from app.modules.system_parameters.models.language import Language
from app.modules.translators.models.translator import Translator
from app.shared.database import get_db

SETUP_LINK_PATTERN = re.compile(r"definir-senha\?token=([A-Za-z0-9_\-]+)")
VALID_PASSWORD = "senha-segura-1"


@dataclass
class AccountEnv:
    client: TestClient
    db: Session
    admin: User
    admin_client: FakeSupabaseAdminClient
    sent_emails: list[dict[str, Any]] = field(default_factory=list)
    fail_email: bool = False

    def act_as(self, user: User) -> None:
        app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
            id=str(user.id), email=user.email
        )

    def create(self, email: str = "ana@example.com", **extra: Any):
        return self.client.post(
            "/api/translators",
            json={
                "name": "Ana Tradutora",
                "email": email,
                "phone": "11999990000",
                "languages": [{"language_id": "en-US", "proficiency_level": "advanced"}],
                **extra,
            },
        )

    def account(self, email: str = "ana@example.com") -> User | None:
        self.db.expire_all()
        return self.db.query(User).filter_by(email=email).one_or_none()

    def last_token(self) -> str:
        match = SETUP_LINK_PATTERN.search(self.sent_emails[-1]["html_body"])
        assert match is not None
        return match.group(1)

    def define_password(self, token: str):
        return self.client.post(
            "/api/auth/password-setup",
            json={
                "token": token,
                "password": VALID_PASSWORD,
                "password_confirmation": VALID_PASSWORD,
            },
        )

    def audit_actions(self) -> list[str]:
        return [
            log.action
            for log in self.db.query(AuthorizationAuditLog)
            .order_by(AuthorizationAuditLog.created_at)
            .all()
        ]


@pytest.fixture
def env(isolated_db_session: Session, monkeypatch: pytest.MonkeyPatch) -> Iterator[AccountEnv]:
    db = isolated_db_session
    admin = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        password_hash="unused",
        role="admin",
        is_active=True,
        roles=[Role(name="Administrador", is_active=True)],
    )
    db.add_all([admin, Role(name="Recursos externos", is_active=True)])
    db.add(Language(id="en-US", name="Inglês"))
    db.flush()

    environment = AccountEnv(
        client=TestClient(app), db=db, admin=admin, admin_client=FakeSupabaseAdminClient()
    )

    def fake_send_email(**kwargs: Any) -> None:
        if environment.fail_email:
            raise RuntimeError("smtp down")
        environment.sent_emails.append(kwargs)

    monkeypatch.setattr(
        "app.modules.internal_users.services.password_setup_email.send_email", fake_send_email
    )
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_supabase_admin_client] = lambda: environment.admin_client
    environment.act_as(admin)
    try:
        yield environment
    finally:
        app.dependency_overrides.clear()


# CRIACAO DA CONTA


def test_creating_translator_creates_inactive_account_with_translator_profile(
    env: AccountEnv,
) -> None:
    response = env.create(email="Ana@Example.com")

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["email"] == "ana@example.com"
    assert body["account"]["status"] == "inativa"
    assert body["account"]["password_defined"] is False
    assert body["account"]["latest_link"]["status"] == "pendente"

    account = env.account()
    assert account is not None
    assert account.is_active is False
    assert account.role == "tradutor"
    assert [role.name for role in account.roles] == ["Recursos externos"]
    assert body["account"]["user_id"] == str(account.id)
    assert str(account.id) == env.admin_client.users["ana@example.com"]["id"]


def test_translator_receives_pending_link_valid_for_three_days(env: AccountEnv) -> None:
    before = datetime.now(UTC)

    env.create()

    assert len(env.sent_emails) == 1
    assert env.sent_emails[0]["to"] == "ana@example.com"
    token = env.db.query(PasswordSetupToken).one()
    assert token.status == "pendente"
    assert before + timedelta(days=3) <= token.expires_at <= datetime.now(UTC) + timedelta(days=3)


def test_creation_prefers_profile_named_tradutor_when_it_exists(env: AccountEnv) -> None:
    env.db.add(Role(name="Tradutor", is_active=True))
    env.db.flush()

    env.create()

    account = env.account()
    assert account is not None
    assert [role.name for role in account.roles] == ["Tradutor"]


def test_creation_does_not_accept_other_profiles(env: AccountEnv) -> None:
    other_role = Role(name="Financeiro", is_active=True)
    env.db.add(other_role)
    env.db.flush()

    response = env.create(role_ids=[str(other_role.id)])

    assert response.status_code == 422
    assert env.db.query(Translator).count() == 0
    assert env.account() is None


def test_account_cannot_authenticate_before_defining_password(env: AccountEnv) -> None:
    env.create()
    account = env.account()
    assert account is not None
    env.act_as(account)

    response = env.client.get("/api/translators/me")

    assert response.status_code == 403
    assert account.password_hash == "!"


def test_admin_never_receives_or_sees_password(env: AccountEnv) -> None:
    created = env.create().json()
    listed = env.client.get("/api/translators").json()

    serialized = str(created) + str(listed)
    assert "password_hash" not in serialized
    assert "senha" not in serialized
    assert listed[0]["account"]["password_defined"] is False


# E-MAILS JA CADASTRADOS


@pytest.mark.parametrize("owner", ["translator", "internal"])
def test_email_already_used_does_not_create_new_account(env: AccountEnv, owner: str) -> None:
    if owner == "translator":
        assert env.create().status_code == 201
    else:
        env.db.add(
            User(
                id=uuid.uuid4(),
                email="ana@example.com",
                password_hash="unused",
                role="interno",
                is_active=True,
            )
        )
        env.db.flush()
    users_before = env.db.query(User).count()

    response = env.create(email="ANA@example.com")

    assert response.status_code == 400
    assert env.db.query(User).count() == users_before
    assert env.db.query(Translator).count() == (1 if owner == "translator" else 0)


# FALHAS NAO DEIXAM CADASTRO PARCIAL


def test_email_failure_rolls_back_translator_account_and_profile(env: AccountEnv) -> None:
    env.fail_email = True

    response = env.create()

    assert response.status_code == 502
    assert env.db.query(Translator).count() == 0
    assert env.account() is None
    assert env.db.query(PasswordSetupToken).count() == 0


def test_identity_provider_failure_creates_nothing(env: AccountEnv) -> None:
    env.admin_client.fail = True

    response = env.create()

    assert response.status_code == 502
    assert env.db.query(Translator).count() == 0
    assert env.account() is None


def test_missing_translator_profile_creates_nothing(env: AccountEnv) -> None:
    env.db.query(Role).filter_by(name="Recursos externos").one().is_active = False
    env.db.flush()

    response = env.create()

    assert response.status_code == 409
    assert env.db.query(Translator).count() == 0
    assert env.account() is None
    assert env.sent_emails == []


# REENVIO E DEFINICAO DA SENHA


def test_resend_rejects_previous_links(env: AccountEnv) -> None:
    translator_id = env.create().json()["id"]
    first_token = env.last_token()

    response = env.client.post(f"/api/translators/{translator_id}/password-setup-link/resend")

    assert response.status_code == 200
    assert response.json()["account"]["latest_link"]["status"] == "pendente"
    statuses = [token.status for token in env.db.query(PasswordSetupToken).all()]
    assert sorted(statuses) == ["pendente", "rejeitado"]
    assert env.define_password(first_token).status_code == 410


def test_resend_is_allowed_after_link_expiration(env: AccountEnv) -> None:
    translator_id = env.create().json()["id"]
    token = env.db.query(PasswordSetupToken).one()
    token.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    env.db.flush()

    response = env.client.post(f"/api/translators/{translator_id}/password-setup-link/resend")

    assert response.status_code == 200
    assert response.json()["account"]["latest_link"]["status"] == "pendente"
    assert env.define_password(env.last_token()).status_code == 200


def test_defining_password_activates_account_and_link_cannot_be_reused(env: AccountEnv) -> None:
    translator_id = env.create().json()["id"]
    token = env.last_token()

    first = env.define_password(token)
    second = env.define_password(token)

    assert first.status_code == 200
    assert second.status_code == 410
    account = env.account()
    assert account is not None
    assert account.is_active is True
    assert account.password_set_at is not None
    assert env.db.query(PasswordSetupToken).one().status == "aceito"
    detail = env.client.get(f"/api/translators/{translator_id}").json()
    assert detail["account"]["status"] == "ativa"
    resend = env.client.post(f"/api/translators/{translator_id}/password-setup-link/resend")
    assert resend.status_code == 409


def test_resend_requires_translators_write_permission(env: AccountEnv) -> None:
    translator_id = env.create().json()["id"]
    reader = User(
        id=uuid.uuid4(),
        email="reader@example.com",
        password_hash="unused",
        role="interno",
        is_active=True,
        roles=[Role(name="Leitura", is_active=True)],
    )
    env.db.add(reader)
    env.db.flush()
    env.act_as(reader)

    response = env.client.post(f"/api/translators/{translator_id}/password-setup-link/resend")

    assert response.status_code == 403


# AUDITORIA


def test_relevant_operations_are_audited(env: AccountEnv) -> None:
    translator_id = env.create().json()["id"]
    env.client.post(f"/api/translators/{translator_id}/password-setup-link/resend")
    env.define_password(env.last_token())

    actions = env.audit_actions()

    assert actions == [
        "translator_account_created",
        "translator_role_added",
        "password_setup_link_sent",
        "password_setup_link_resent",
        "password_defined",
    ]
    created = env.db.query(AuthorizationAuditLog).filter_by(action="translator_account_created")
    assert created.one().actor_user_id == env.admin.id


# ALTERACAO E REMOCAO DO TRADUTOR


def _update_payload(email: str, name: str = "Ana Tradutora") -> dict[str, Any]:
    return {
        "name": name,
        "email": email,
        "phone": "11999990000",
        "languages": [{"language_id": "en-US", "proficiency_level": "advanced"}],
    }


def test_email_change_while_pending_moves_account_and_invalidates_link(env: AccountEnv) -> None:
    translator_id = env.create().json()["id"]

    response = env.client.put(
        f"/api/translators/{translator_id}", json=_update_payload("nova@example.com", "Ana Nova")
    )

    assert response.status_code == 200, response.text
    assert env.account("ana@example.com") is None
    account = env.account("nova@example.com")
    assert account is not None
    assert account.name == "Ana Nova"
    assert env.db.query(PasswordSetupToken).one().status == "rejeitado"
    assert "nova@example.com" in env.admin_client.users


def test_email_change_after_activation_is_blocked(env: AccountEnv) -> None:
    translator_id = env.create().json()["id"]
    env.define_password(env.last_token())

    response = env.client.put(
        f"/api/translators/{translator_id}", json=_update_payload("nova@example.com")
    )

    assert response.status_code == 409
    assert env.db.get(Translator, uuid.UUID(translator_id)).email == "ana@example.com"


def test_deleting_translator_removes_account_that_was_never_activated(env: AccountEnv) -> None:
    translator_id = env.create().json()["id"]

    response = env.client.delete(f"/api/translators/{translator_id}")

    assert response.status_code == 204
    assert env.account() is None
    assert env.create().status_code == 201


def test_deleting_translator_deactivates_account_with_password(env: AccountEnv) -> None:
    translator_id = env.create().json()["id"]
    env.define_password(env.last_token())

    env.client.delete(f"/api/translators/{translator_id}")

    account = env.account()
    assert account is not None
    assert account.is_active is False
