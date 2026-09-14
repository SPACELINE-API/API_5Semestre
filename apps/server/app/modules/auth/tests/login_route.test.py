import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.modules.auth.dependencies import get_supabase_auth_client
from app.modules.auth.exceptions import SupabaseAuthInvalidCredentialsError
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

    def login_with_password(self, _email: str, _password: str) -> SupabaseAuthSession:
        return self.session


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
