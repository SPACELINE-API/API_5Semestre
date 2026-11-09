import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.auth.exceptions.exceptions import SupabaseAdminUnexpectedError
from app.modules.auth.models.user import User
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.auth.security.security import hash_password
from app.modules.auth.services.authorization_audit_service import record_authorization_change
from app.modules.auth.services.supabase_admin_client import SupabaseAdminClient
from app.modules.internal_users.models.password_setup_token import (
    LINK_STATUS_ACEITO,
    LINK_STATUS_EXPIRADO,
    LINK_STATUS_PENDENTE,
    LINK_STATUS_REJEITADO,
    PASSWORD_SETUP_LINK_VALIDITY_DAYS,
    PasswordSetupToken,
)
from app.modules.internal_users.repositories.password_setup_token_repository import (
    PasswordSetupTokenRepository,
)
from app.modules.internal_users.schemas.internal_user import (
    InternalUserResponse,
    PasswordSetupLinkInfo,
)
from app.modules.internal_users.services.internal_user_service import (
    AUDIT_TARGET_TYPE,
    InternalUserService,
)
from app.modules.internal_users.services.password_setup_email import send_password_setup_email
from app.modules.internal_users.services.presenter import present_user, user_snapshot
from app.shared.EnvProvider import env_provider

ACTION_LINK_SENT = "password_setup_link_sent"
ACTION_LINK_RESENT = "password_setup_link_resent"
ACTION_PASSWORD_DEFINED = "password_defined"

INACTIVE_LINK_MESSAGES = {
    LINK_STATUS_ACEITO: "Este link já foi utilizado",
    LINK_STATUS_REJEITADO: "Este link foi substituído por um mais recente",
    LINK_STATUS_EXPIRADO: "Este link expirou. Solicite um novo link ao administrador",
}


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def build_setup_url(raw_token: str) -> str:
    return f"{env_provider.get_site_url().rstrip('/')}/definir-senha?token={raw_token}"


class PasswordSetupService:
    def __init__(self, db: Session, admin_client: SupabaseAdminClient | None = None):
        self.db = db
        self.admin_client = admin_client
        self.tokens = PasswordSetupTokenRepository(db)

    @property
    def people(self) -> InternalUserService:
        return InternalUserService(self.db, self._require_admin_client())

    def _require_admin_client(self) -> SupabaseAdminClient:
        if self.admin_client is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor",
            )
        return self.admin_client

    def send_initial(
        self, user_id: uuid.UUID, actor: SupabaseAuthenticatedUser
    ) -> InternalUserResponse:
        user = self._load_pending_user(user_id)
        if self.tokens.has_any(user.id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="O link inicial já foi enviado. Use o reenvio",
            )
        return self._issue(user, actor, ACTION_LINK_SENT)

    def resend(self, user_id: uuid.UUID, actor: SupabaseAuthenticatedUser) -> InternalUserResponse:
        user = self._load_pending_user(user_id)
        self.tokens.expire_overdue(user.id)
        if not self.tokens.has_any(user.id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Nenhum link foi enviado ainda. Use o envio inicial",
            )
        return self._issue(user, actor, ACTION_LINK_RESENT)

    def describe(self, raw_token: str) -> PasswordSetupLinkInfo:
        token = self.tokens.get_by_hash(hash_token(raw_token))
        if token is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link inválido")

        self._expire_if_overdue(token)
        self.db.commit()
        if token.status != LINK_STATUS_PENDENTE:
            return PasswordSetupLinkInfo(status=token.status, expires_at=token.expires_at)

        user = self.db.get(User, token.user_id)
        return PasswordSetupLinkInfo(
            status=token.status,
            name=user.name if user else None,
            email=user.email if user else None,
            expires_at=token.expires_at,
        )

    def define_password(self, raw_token: str, password: str) -> None:
        token = self.tokens.get_by_hash_for_update(hash_token(raw_token))
        if token is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link inválido")

        self._expire_if_overdue(token)
        if token.status != LINK_STATUS_PENDENTE:
            self.db.commit()
            raise HTTPException(
                status_code=status.HTTP_410_GONE, detail=INACTIVE_LINK_MESSAGES[token.status]
            )

        user = self.db.get(User, token.user_id)
        if user is None or user.password_set_at is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Esta conta não aguarda senha"
            )

        try:
            self._require_admin_client().update_user(str(user.id), password=password)
        except SupabaseAdminUnexpectedError as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Não foi possível definir a senha",
            ) from error

        now = datetime.now(UTC)
        before = user_snapshot(user)
        user.password_hash = hash_password(password)
        user.password_set_at = now
        user.email_verified_at = now
        user.is_active = True
        user.failed_login_attempts = 0
        user.locked_until = None
        token.status = LINK_STATUS_ACEITO
        token.used_at = now
        record_authorization_change(
            self.db,
            target_type=AUDIT_TARGET_TYPE,
            target_id=user.id,
            target_name=user.email,
            action=ACTION_PASSWORD_DEFINED,
            actor_user_id=user.id,
            actor_email=user.email,
            before=before,
            after=user_snapshot(user),
        )
        self.db.commit()

    def _issue(
        self, user: User, actor: SupabaseAuthenticatedUser, action: str
    ) -> InternalUserResponse:
        self.tokens.expire_overdue(user.id)
        self.tokens.reject_pending(user.id)
        self.db.flush()

        raw_token = secrets.token_urlsafe(32)
        issued_at = datetime.now(UTC)
        token = PasswordSetupToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            status=LINK_STATUS_PENDENTE,
            created_at=issued_at,
            expires_at=issued_at + timedelta(days=PASSWORD_SETUP_LINK_VALIDITY_DAYS),
            sent_by=uuid.UUID(actor.id),
        )
        try:
            self.tokens.add(token)
        except IntegrityError as error:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe um envio em andamento para esta conta",
            ) from error

        try:
            send_password_setup_email(
                user.email,
                user.name or user.email,
                build_setup_url(raw_token),
                PASSWORD_SETUP_LINK_VALIDITY_DAYS,
            )
        except Exception as error:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Não foi possível enviar o e-mail com o link",
            ) from error

        self.people.record_audit(
            user,
            actor,
            action,
            None,
            {"link_status": token.status, "expires_at": token.expires_at.isoformat()},
        )
        self.db.commit()
        self.db.refresh(token)
        return present_user(user, token)

    def _load_pending_user(self, user_id: uuid.UUID) -> User:
        user = self.people.load_user(user_id)
        if user.is_active or user.password_set_at is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="O link só pode ser enviado a contas inativas e sem senha",
            )
        return user

    def _expire_if_overdue(self, token: PasswordSetupToken) -> None:
        if token.status == LINK_STATUS_PENDENTE and token.expires_at <= datetime.now(UTC):
            token.status = LINK_STATUS_EXPIRADO
