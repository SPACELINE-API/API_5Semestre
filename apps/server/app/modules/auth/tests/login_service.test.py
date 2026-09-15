import uuid
from datetime import timedelta
from zoneinfo import ZoneInfo

import pytest

from app.modules.auth.exceptions.exceptions import (
    AuthUserAccessDeniedError,
    SupabaseAuthInvalidCredentialsError,
)
from app.modules.auth.policies.policy import now_in_sao_paulo
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
    def __init__(self, *, is_active: bool = True) -> None:
        self.id = uuid.UUID("8bdf1a90-b7f2-45d9-a523-09dbf8f39e46")
        self.email = "user@example.com"
        self.is_active = is_active
        self.last_login_at = None
        self.failed_login_attempts = 0
        self.locked_until = None


class FakeSupabaseAuthClient:
    def __init__(self) -> None:
        self.calls = 0

    def login_with_password(self, _email: str, _password: str) -> SupabaseAuthSession:
        self.calls += 1
        return SupabaseAuthSession(
            access_token="access-token",
            token_type="bearer",
            expires_in=3600,
            user=SupabaseAuthenticatedUser(id="supabase-user-id", email="user@example.com"),
        )


class InvalidCredentialsSupabaseAuthClient:
    def __init__(self) -> None:
        self.calls = 0

    def login_with_password(self, _email: str, _password: str) -> SupabaseAuthSession:
        self.calls += 1
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
    supabase_client = FakeSupabaseAuthClient()

    with pytest.raises(AuthUserAccessDeniedError):
        LoginService(FakeDatabaseSession(user), supabase_client).login(
            "user@example.com", "secret123"
        )

    assert supabase_client.calls == 0


def test_login_service_allows_login_after_lockout_expires() -> None:
    user = FakeUser()
    user.failed_login_attempts = 3
    user.locked_until = now_in_sao_paulo() - timedelta(minutes=1)
    supabase_client = FakeSupabaseAuthClient()

    LoginService(FakeDatabaseSession(user), supabase_client).login("user@example.com", "secret123")

    assert supabase_client.calls == 1
    assert user.failed_login_attempts == 0
    assert user.locked_until is None


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
