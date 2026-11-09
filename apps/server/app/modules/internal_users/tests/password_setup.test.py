import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.modules.auth.exceptions.exceptions import AuthUserAccessDeniedError
from app.modules.auth.models.authorization_audit import AuthorizationAuditLog
from app.modules.auth.models.user import User
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser, SupabaseAuthSession
from app.modules.auth.services.login_service import LoginService
from app.modules.internal_users.models.password_setup_token import PasswordSetupToken

VALID_PASSWORD = "SenhaForte123"


def link_url(person_id: str, suffix: str = "") -> str:
    return f"/api/internal-users/{person_id}/password-setup-link{suffix}"


def define(env, token: str, password: str = VALID_PASSWORD, confirmation: str | None = None):
    return env.client.post(
        "/api/auth/password-setup",
        json={
            "token": token,
            "password": password,
            "password_confirmation": confirmation if confirmation is not None else password,
        },
    )


def expire_token(env, raw_token: str) -> None:
    from app.modules.internal_users.services.password_setup_service import hash_token

    token = env.db.scalar(
        select(PasswordSetupToken).where(PasswordSetupToken.token_hash == hash_token(raw_token))
    )
    token.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    env.db.flush()


def test_initial_send_creates_pending_link_valid_for_three_days(env) -> None:
    person = env.create_person(env.role("Projetos"))

    response = env.client.post(link_url(person["id"]))

    assert response.status_code == 200
    link = response.json()["latest_link"]
    assert link["status"] == "pendente"
    sent_at = datetime.fromisoformat(link["sent_at"])
    expires_at = datetime.fromisoformat(link["expires_at"])
    assert expires_at - sent_at == timedelta(days=3)
    assert len(env.sent_emails) == 1
    email = env.sent_emails[0]
    assert email["to"] == "ana@example.com"
    assert "Ana Souza" in email["html_body"]
    assert "/definir-senha?token=" in email["html_body"]
    assert response.json()["is_active"] is False


def test_initial_send_cannot_be_repeated_and_resend_requires_prior_send(env) -> None:
    person = env.create_person(env.role("Projetos"))

    resend_first = env.client.post(link_url(person["id"], "/resend"))
    first = env.client.post(link_url(person["id"]))
    second = env.client.post(link_url(person["id"]))

    assert resend_first.status_code == 409
    assert first.status_code == 200
    assert second.status_code == 409
    assert len(env.sent_emails) == 1


def test_resend_rejects_previous_link_and_old_link_stops_working(env) -> None:
    person = env.create_person(env.role("Projetos"))
    env.client.post(link_url(person["id"]))
    first_token = env.last_token()

    resent = env.client.post(link_url(person["id"], "/resend"))
    second_token = env.last_token()

    assert resent.status_code == 200
    assert first_token != second_token
    assert env.client.get(f"/api/auth/password-setup/{first_token}").json()["status"] == "rejeitado"
    rejected_use = define(env, first_token)
    assert rejected_use.status_code == 410
    assert "substituído" in rejected_use.json()["detail"]
    assert env.client.get(f"/api/auth/password-setup/{second_token}").json()["status"] == "pendente"
    tokens = env.db.scalars(select(PasswordSetupToken)).all()
    assert sorted(token.status for token in tokens) == ["pendente", "rejeitado"]


def test_resend_after_expiration_keeps_old_link_expired_and_issues_new_one(env) -> None:
    person = env.create_person(env.role("Projetos"))
    env.client.post(link_url(person["id"]))
    first_token = env.last_token()
    expire_token(env, first_token)

    resent = env.client.post(link_url(person["id"], "/resend"))
    new_token = env.last_token()

    assert resent.status_code == 200
    assert env.client.get(f"/api/auth/password-setup/{first_token}").json()["status"] == "expirado"
    assert define(env, first_token).status_code == 410
    assert define(env, new_token).status_code == 200


def test_unused_link_after_three_days_becomes_expired_everywhere(env) -> None:
    person = env.create_person(env.role("Projetos"))
    env.client.post(link_url(person["id"]))
    token = env.last_token()
    expire_token(env, token)

    listed = env.client.get("/api/internal-users", params={"is_active": "false"}).json()
    describe = env.client.get(f"/api/auth/password-setup/{token}")
    attempt = define(env, token)

    assert listed[0]["latest_link"]["status"] == "expirado"
    assert describe.status_code == 200
    assert describe.json() == {
        "status": "expirado",
        "name": None,
        "email": None,
        "expires_at": describe.json()["expires_at"],
    }
    assert attempt.status_code == 410
    assert "expirou" in attempt.json()["detail"]
    stored = env.db.get(User, uuid.UUID(person["id"]))
    assert stored.is_active is False and stored.password_set_at is None


def test_defining_password_activates_account_and_marks_link_accepted(env) -> None:
    projetos = env.role("Projetos", ("quotes.read",))
    person = env.create_person(projetos)
    env.client.post(link_url(person["id"]))
    token = env.last_token()

    info = env.client.get(f"/api/auth/password-setup/{token}").json()
    response = define(env, token)

    assert info["status"] == "pendente"
    assert info["name"] == "Ana Souza" and info["email"] == "ana@example.com"
    assert response.status_code == 200
    stored = env.db.get(User, uuid.UUID(person["id"]))
    assert stored.is_active is True
    assert stored.password_set_at is not None
    assert stored.email_verified_at is not None
    assert stored.password_hash not in ("!", VALID_PASSWORD)
    assert env.admin_client.users["ana@example.com"]["password"] == VALID_PASSWORD
    detail = env.client.get(f"/api/internal-users/{person['id']}").json()
    assert detail["status"] == "ativa"
    assert detail["password_defined"] is True
    assert detail["latest_link"]["status"] == "aceito"
    assert detail["latest_link"]["used_at"] is not None


def test_accepted_link_cannot_be_reused(env) -> None:
    person = env.create_person(env.role("Projetos"))
    env.client.post(link_url(person["id"]))
    token = env.last_token()
    assert define(env, token).status_code == 200

    reuse = define(env, token, "OutraSenha456")

    assert reuse.status_code == 410
    assert "utilizado" in reuse.json()["detail"]
    assert env.admin_client.users["ana@example.com"]["password"] == VALID_PASSWORD
    assert env.client.get(f"/api/auth/password-setup/{token}").json()["status"] == "aceito"


def test_password_validation_and_unknown_token(env) -> None:
    person = env.create_person(env.role("Projetos"))
    env.client.post(link_url(person["id"]))
    token = env.last_token()

    mismatch = define(env, token, VALID_PASSWORD, "Diferente123")
    short = define(env, token, "curta", "curta")
    unknown = define(env, "token-inexistente")
    unknown_info = env.client.get("/api/auth/password-setup/token-inexistente")

    assert mismatch.status_code == 422
    assert short.status_code == 422
    assert unknown.status_code == 404
    assert unknown_info.status_code == 404
    assert env.client.get(f"/api/auth/password-setup/{token}").json()["status"] == "pendente"


def test_resend_not_allowed_once_account_has_password_or_is_deactivated(env) -> None:
    person = env.create_person(env.role("Projetos"))
    env.client.post(link_url(person["id"]))
    define(env, env.last_token())

    after_password = env.client.post(link_url(person["id"], "/resend"))
    initial_after_password = env.client.post(link_url(person["id"]))
    env.client.post(f"/api/internal-users/{person['id']}/deactivate")
    after_deactivation = env.client.post(link_url(person["id"], "/resend"))

    assert after_password.status_code == 409
    assert initial_after_password.status_code == 409
    assert after_deactivation.status_code == 409


def test_email_failure_keeps_current_link_and_creates_no_new_one(env) -> None:
    person = env.create_person(env.role("Projetos"))
    env.client.post(link_url(person["id"]))
    env.fail_email = True

    response = env.client.post(link_url(person["id"], "/resend"))

    assert response.status_code == 502
    assert len(env.sent_emails) == 1
    tokens = env.db.scalars(select(PasswordSetupToken)).all()
    assert len(tokens) <= 1
    assert not any(token.status == "rejeitado" for token in tokens)


class StubAuthClient:
    def login_with_password(self, email: str, password: str) -> SupabaseAuthSession:
        return SupabaseAuthSession(
            access_token="token",
            token_type="bearer",
            expires_in=3600,
            user=SupabaseAuthenticatedUser(id=str(uuid.uuid4()), email=email),
        )


def test_inactive_account_cannot_authenticate_until_password_is_defined(env) -> None:
    person = env.create_person(env.role("Projetos"))
    login = LoginService(env.db, StubAuthClient())

    with pytest.raises(AuthUserAccessDeniedError):
        login.login("ana@example.com", "qualquer-senha")

    env.client.post(link_url(person["id"]))
    with pytest.raises(AuthUserAccessDeniedError):
        login.login("ana@example.com", "qualquer-senha")

    define(env, env.last_token())
    session = login.login("ana@example.com", VALID_PASSWORD)
    assert session.user.email == "ana@example.com"


def test_permissions_of_associated_roles_apply_after_activation(env) -> None:
    projetos = env.role("Projetos", ("quotes.read",))
    financeiro = env.role("Financeiro", ("finance.read",))
    person = env.create_person(projetos)
    env.client.post(
        f"/api/internal-users/{person['id']}/roles", json={"role_id": str(financeiro.id)}
    )
    env.client.post(link_url(person["id"]))
    define(env, env.last_token())

    stored = env.db.get(User, uuid.UUID(person["id"]))
    env.act_as(stored)
    me = env.client.get("/api/auth/me")
    forbidden = env.client.get("/api/internal-users")

    assert me.status_code == 200
    assert me.json()["permissions"] == ["finance.read", "quotes.read"]
    assert forbidden.status_code == 403


def test_full_lifecycle_is_audited(env) -> None:
    projetos = env.role("Projetos")
    financeiro = env.role("Financeiro")
    person = env.create_person(projetos)
    base = f"/api/internal-users/{person['id']}"
    env.client.patch(base, json={"name": "Ana Maria"})
    env.client.post(f"{base}/roles", json={"role_id": str(financeiro.id)})
    env.client.delete(f"{base}/roles/{financeiro.id}")
    env.client.post(link_url(person["id"]))
    env.client.post(link_url(person["id"], "/resend"))
    define(env, env.last_token())
    env.client.post(f"{base}/deactivate")

    rows = env.db.scalars(
        select(AuthorizationAuditLog).where(
            AuthorizationAuditLog.target_id == uuid.UUID(person["id"])
        )
    ).all()
    by_action = {row.action: row for row in rows}

    assert sorted(row.action for row in rows) == sorted(
        [
            "internal_user_created",
            "internal_user_updated",
            "internal_user_role_added",
            "internal_user_role_removed",
            "password_setup_link_sent",
            "password_setup_link_resent",
            "password_defined",
            "internal_user_deactivated",
        ]
    )
    assert by_action["internal_user_created"].actor_email == "admin@example.com"
    assert by_action["password_defined"].actor_email == "ana@example.com"
    assert all("token" not in str(row.after) for row in rows)
