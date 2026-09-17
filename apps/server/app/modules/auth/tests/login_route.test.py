import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.modules.auth.dependencies.dependencies import get_supabase_auth_client
from app.modules.auth.exceptions.exceptions import SupabaseAuthInvalidCredentialsError
from app.modules.auth.schemas.supabase import (
    SupabaseAuthenticatedUser,
    SupabaseAuthSession,
)
from app.shared.database import get_db


class FakeDatabaseSession:
    def __init__(self, user: object | None) -> None:
        self.user = user
        self.committed = False

    def scalar(self, _statement: object) -> object | None:
        return self.user

    def commit(self) -> None:
        self.committed = True


class FakeUser:
    def __init__(self, *, is_active: bool = True) -> None:
        self.id = uuid.UUID("8bdf1a90-b7f2-45d9-a523-09dbf8f39e46")
        self.email = "user@example.com"
        self.is_active = is_active
        self.last_login_at = None
        self.failed_login_attempts = 0
        self.locked_until = None


class FakeSupabaseAuthClient:
    def __init__(self, session: SupabaseAuthSession | None = None) -> None:
        self.session = session or SupabaseAuthSession(
            access_token="access-token",
            token_type="bearer",
            expires_in=3600,
            user=SupabaseAuthenticatedUser(
                id="supabase-user-id",
                email="user@example.com",
            ),
        )
        self.recovery_request: tuple[str, str] | None = None
        self.password_update: tuple[str, str] | None = None

    def login_with_password(self, _email: str, _password: str) -> SupabaseAuthSession:
        return self.session

    def request_password_recovery(self, email: str, redirect_to: str) -> None:
        self.recovery_request = (email, redirect_to)

    def update_password(self, access_token: str, password: str) -> None:
        self.password_update = (access_token, password)


class InvalidCredentialsSupabaseAuthClient:
    def login_with_password(self, _email: str, _password: str) -> SupabaseAuthSession:
        raise SupabaseAuthInvalidCredentialsError


def client_with_dependencies(
    *,
    db_session: FakeDatabaseSession,
    supabase_auth_client: object,
) -> TestClient:
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_supabase_auth_client] = lambda: supabase_auth_client

    return TestClient(app)


def test_login_returns_session_when_credentials_are_valid_and_user_is_active() -> None:
    user = FakeUser(is_active=True)
    db_session = FakeDatabaseSession(user)
    client = client_with_dependencies(
        db_session=db_session,
        supabase_auth_client=FakeSupabaseAuthClient(),
    )

    response = client.post(
        "/api/auth/login",
        json={"email": "user@example.com", "password": "secret123"},
    )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "access_token": "access-token",
        "token_type": "bearer",
        "expires_in": 3600,
        "user": {
            "id": "8bdf1a90-b7f2-45d9-a523-09dbf8f39e46",
            "email": "user@example.com",
        },
    }
    assert user.last_login_at is not None
    assert db_session.committed is True


def test_login_accepts_senha_as_password_alias() -> None:
    client = client_with_dependencies(
        db_session=FakeDatabaseSession(FakeUser(is_active=True)),
        supabase_auth_client=FakeSupabaseAuthClient(),
    )

    response = client.post(
        "/api/auth/login",
        json={"email": "user@example.com", "senha": "secret123"},
    )

    app.dependency_overrides.clear()

    assert response.status_code == 200


def test_login_rejects_invalid_credentials() -> None:
    client = client_with_dependencies(
        db_session=FakeDatabaseSession(FakeUser()),
        supabase_auth_client=InvalidCredentialsSupabaseAuthClient(),
    )

    response = client.post(
        "/api/auth/login",
        json={"email": "user@example.com", "password": "wrong-password"},
    )

    app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.json() == {"detail": "Credenciais inválidas"}


def test_login_rejects_inactive_user() -> None:
    client = client_with_dependencies(
        db_session=FakeDatabaseSession(FakeUser(is_active=False)),
        supabase_auth_client=FakeSupabaseAuthClient(),
    )

    response = client.post(
        "/api/auth/login",
        json={"email": "user@example.com", "password": "secret123"},
    )

    app.dependency_overrides.clear()

    assert response.status_code == 403
    assert response.json() == {"detail": "Usuário sem permissão de acesso"}


def test_password_recovery_uses_site_url_and_returns_generic_message() -> None:
    supabase_client = FakeSupabaseAuthClient()
    client = client_with_dependencies(
        db_session=FakeDatabaseSession(None),
        supabase_auth_client=supabase_client,
    )

    response = client.post(
        "/api/auth/password-recovery",
        json={"email": "user@example.com"},
    )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"message": "E-mail enviado para o destinatário."}
    assert supabase_client.recovery_request == (
        "user@example.com",
        "http://localhost:5173/login",
    )


def test_password_reset_updates_password_with_recovery_token() -> None:
    supabase_client = FakeSupabaseAuthClient()
    client = client_with_dependencies(
        db_session=FakeDatabaseSession(None),
        supabase_auth_client=supabase_client,
    )

    response = client.post(
        "/api/auth/password-reset",
        json={
            "access_token": "recovery-token",
            "password": "new-secret",
            "password_confirmation": "new-secret",
        },
    )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"message": "Senha atualizada com sucesso"}
    assert supabase_client.password_update == ("recovery-token", "new-secret")


def test_password_reset_rejects_mismatched_passwords() -> None:
    supabase_client = FakeSupabaseAuthClient()
    client = client_with_dependencies(
        db_session=FakeDatabaseSession(None),
        supabase_auth_client=supabase_client,
    )

    response = client.post(
        "/api/auth/password-reset",
        json={
            "access_token": "recovery-token",
            "password": "new-secret",
            "password_confirmation": "different-secret",
        },
    )

    app.dependency_overrides.clear()

    assert response.status_code == 422
    assert supabase_client.password_update is None
