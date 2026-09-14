import uuid
from zoneinfo import ZoneInfo

import pytest

from apps.server.app.modules.auth.exceptions.exceptions import (
    AuthUserAccessDeniedError,
    SupabaseAuthInvalidCredentialsError,
)
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser, SupabaseAuthSession
from app.modules.auth.services.login_service import LoginService


class FakeDatabaseSession:
    def __init__(self, user: object | None) -> None:
        self.user = user
        self.committed = False

    def scalar(self, _statement: object) -> object | None:
        return self.user

    def commit(self) -> None:
        self.committed = True


class FakeUser:
    id = uuid.UUID("8bdf1a90-b7f2-45d9-a523-09dbf8f39e46")
    email = "user@example.com"
    is_active = True
    last_login_at = None
    failed_login_attempts = 0
    locked_until = None


class FakeSupabaseAuthClient:
    def login_with_password(self, _email: str, _password: str) -> SupabaseAuthSession:
        return SupabaseAuthSession(
            access_token="access-token",
            token_type="bearer",
            expires_in=3600,
            user=SupabaseAuthenticatedUser(id="supabase-user-id", email="user@example.com"),
        )


class InvalidCredentialsSupabaseAuthClient:
    def login_with_password(self, _email: str, _password: str) -> SupabaseAuthSession:
        raise SupabaseAuthInvalidCredentialsError


def test_login_service_authenticates_and_updates_last_login() -> None:
    db = FakeDatabaseSession(FakeUser())
    response = LoginService(db, FakeSupabaseAuthClient()).login("user@example.com", "secret123")

    assert response.access_token == "access-token"
    assert response.user.email == "user@example.com"
    assert db.committed is True
    assert db.user.last_login_at is not None


def test_login_service_rejects_inactive_user() -> None:
    user = FakeUser()
    user.is_active = False

    with pytest.raises(AuthUserAccessDeniedError):
        LoginService(FakeDatabaseSession(user), FakeSupabaseAuthClient()).login(
            "user@example.com", "secret123"
        )


def test_login_service_blocks_user_after_three_invalid_attempts() -> None:
    user = FakeUser()
    db = FakeDatabaseSession(user)
    service = LoginService(db, InvalidCredentialsSupabaseAuthClient())

    for _ in range(3):
        with pytest.raises(SupabaseAuthInvalidCredentialsError):
            service.login("user@example.com", "wrong-password")

    assert user.failed_login_attempts == 3
    assert user.locked_until is not None
    assert user.locked_until.tzinfo == ZoneInfo("America/Sao_Paulo")
