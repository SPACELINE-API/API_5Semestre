from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from apps.server.app.modules.auth.exceptions.exceptions import (
    AuthUserAccessDeniedError,
    SupabaseAuthInvalidCredentialsError,
)
from app.modules.auth.models.user import User
from apps.server.app.modules.auth.policies.policy import (
    LOGIN_LOCKOUT_TIMEOUT_MINUTES,
    LOGIN_MAX_ATTEMPTS,
    now_in_sao_paulo,
)
from app.modules.auth.schemas.login import LoginResponse, UserResponse
from app.modules.auth.services.supabase_auth_client import SupabaseAuthClient


class LoginService:
    def __init__(self, db: Session, supabase_auth_client: SupabaseAuthClient) -> None:
        self.db = db
        self.supabase_auth_client = supabase_auth_client

    def login(self, email: str, password: str) -> LoginResponse:
        user = self.db.scalar(select(User).where(User.email == email))

        if user is not None and user.locked_until is not None:
            if user.locked_until > datetime.now(UTC):
                raise AuthUserAccessDeniedError
            user.locked_until = None
            user.failed_login_attempts = 0

        try:
            session = self.supabase_auth_client.login_with_password(email, password)
        except SupabaseAuthInvalidCredentialsError:
            self._register_failed_attempt(user)
            raise

        user = self.db.scalar(select(User).where(User.email == session.user.email))

        if user is None or not user.is_active:
            raise AuthUserAccessDeniedError

        user.last_login_at = datetime.now(UTC)
        user.failed_login_attempts = 0
        user.locked_until = None
        self.db.commit()

        return LoginResponse(
            access_token=session.access_token,
            token_type=session.token_type,
            expires_in=session.expires_in,
            user=UserResponse(id=str(user.id), email=user.email),
        )

    def _register_failed_attempt(self, user: User | None) -> None:
        if user is None:
            return

        user.failed_login_attempts += 1
        if user.failed_login_attempts >= LOGIN_MAX_ATTEMPTS:
            user.locked_until = now_in_sao_paulo() + timedelta(
                minutes=LOGIN_LOCKOUT_TIMEOUT_MINUTES
            )
        self.db.commit()
