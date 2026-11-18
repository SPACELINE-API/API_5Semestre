import secrets
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.modules.auth.exceptions.exceptions import SupabaseAdminUnexpectedError
from app.modules.auth.models.roles import Role
from app.modules.auth.models.user import User
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.auth.services.authorization_audit_service import record_authorization_change
from app.modules.auth.services.supabase_admin_client import SupabaseAdminClient
from app.modules.internal_users.repositories.password_setup_token_repository import (
    PasswordSetupTokenRepository,
)
from app.modules.internal_users.services.identity_rules import (
    EXTERNAL_ROLE_NAMES,
    TRANSLATOR_LEGACY_ROLE,
)
from app.modules.internal_users.services.password_setup_service import PasswordSetupService
from app.modules.internal_users.services.presenter import (
    account_status,
    roles_snapshot,
    user_snapshot,
)
from app.modules.translators.models.translator import Translator
from app.modules.translators.schemas.translator import (
    TranslatorAccountLinkResponse,
    TranslatorAccountResponse,
)

UNUSABLE_PASSWORD_HASH = "!"
EMAIL_ALREADY_REGISTERED = "Email already registered"

AUDIT_TARGET_TYPE = "user"
ACTION_ACCOUNT_CREATED = "translator_account_created"
ACTION_ROLE_ADDED = "translator_role_added"
ACTION_ACCOUNT_EMAIL_UPDATED = "translator_account_email_updated"
ACTION_ACCOUNT_REMOVED = "translator_account_removed"
ACTION_ACCOUNT_DEACTIVATED = "translator_account_deactivated"

# PERFIL TRADUTOR: O SEED CHAMA DE "RECURSOS EXTERNOS"; "TRADUTOR" TEM PRIORIDADE SE EXISTIR
TRANSLATOR_ROLE_PRIORITY = ("tradutor", "tradutora", "recursos externos")


# CONTA DE ACESSO CRIADA JUNTO COM O CADASTRO DO TRADUTOR, LIGADA A ELE PELO E-MAIL
class TranslatorAccountService:
    def __init__(self, db: Session, admin_client: SupabaseAdminClient | None = None):
        self.db = db
        self.admin_client = admin_client
        self.tokens = PasswordSetupTokenRepository(db)

    # QUALQUER FALHA DESFAZ O TRADUTOR JA ENVIADO AO BANCO NA MESMA TRANSACAO
    def open_account(self, translator: Translator, actor: SupabaseAuthenticatedUser) -> None:
        try:
            self._open_account(translator, actor)
        except Exception:
            self.db.rollback()
            raise

    def _open_account(self, translator: Translator, actor: SupabaseAuthenticatedUser) -> None:
        admin_client = self._require_admin_client()
        role = self._translator_role()

        try:
            auth_user = admin_client.create_or_get_user(translator.email, secrets.token_urlsafe(32))
        except SupabaseAdminUnexpectedError as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Não foi possível criar a conta de acesso",
            ) from error

        # A CONTA NASCE INATIVA E SEM SENHA; SO O PROPRIO TRADUTOR DEFINE A SENHA PELO LINK
        user = User(
            id=uuid.UUID(str(auth_user["id"])),
            email=translator.email,
            name=translator.name,
            phone=translator.phone,
            password_hash=UNUSABLE_PASSWORD_HASH,
            is_active=False,
            role=TRANSLATOR_LEGACY_ROLE,
            roles=[role],
        )
        self.db.add(user)
        try:
            self.db.flush()
        except IntegrityError as error:
            raise HTTPException(status_code=400, detail=EMAIL_ALREADY_REGISTERED) from error

        self._audit(user, actor, ACTION_ACCOUNT_CREATED, None, user_snapshot(user))
        self._audit(user, actor, ACTION_ROLE_ADDED, {"roles": []}, roles_snapshot(user))
        # ENVIA O LINK E CONFIRMA TUDO JUNTO; SE O ENVIO FALHAR, TRADUTOR E CONTA SAO DESFEITOS
        PasswordSetupService(self.db, admin_client).send_initial_to(user, actor)

    def resend_link(self, translator: Translator, actor: SupabaseAuthenticatedUser) -> None:
        user = self.find_account(translator.email)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conta de acesso do tradutor não encontrada",
            )
        PasswordSetupService(self.db, self._require_admin_client()).resend_to(user, actor)

    # MANTEM A CONTA COM O MESMO E-MAIL DO TRADUTOR; SO E PERMITIDO ANTES DA SENHA SER DEFINIDA
    def change_email(
        self,
        old_email: str,
        new_email: str,
        actor: SupabaseAuthenticatedUser,
    ) -> None:
        user = self.find_account(old_email)
        if user is None:
            return
        if user.password_set_at is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="O e-mail só pode ser alterado enquanto a conta aguarda a senha",
            )
        before = user_snapshot(user)
        try:
            self._require_admin_client().update_user(str(user.id), email=new_email)
        except SupabaseAdminUnexpectedError as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Não foi possível atualizar a conta de acesso",
            ) from error
        user.email = new_email
        # O LINK ENVIADO AO E-MAIL ANTIGO DEIXA DE FUNCIONAR
        self.tokens.reject_pending(user.id)
        self._audit(user, actor, ACTION_ACCOUNT_EMAIL_UPDATED, before, user_snapshot(user))

    def sync_profile(self, email: str, name: str, phone: str) -> None:
        user = self.find_account(email)
        if user is not None:
            user.name = name
            user.phone = phone

    # CONTA QUE NUNCA FOI ATIVADA E REMOVIDA; CONTA COM SENHA DEFINIDA APENAS E DESATIVADA
    def close_account(self, email: str, actor: SupabaseAuthenticatedUser | None) -> None:
        user = self.find_account(email)
        if user is None:
            return
        before = user_snapshot(user)
        if user.password_set_at is None:
            self._audit(user, actor, ACTION_ACCOUNT_REMOVED, before, None)
            self.db.delete(user)
            return
        user.is_active = False
        self.tokens.reject_pending(user.id)
        self._audit(user, actor, ACTION_ACCOUNT_DEACTIVATED, before, user_snapshot(user))

    def find_account(self, email: str) -> User | None:
        return self.db.scalar(
            select(User)
            .options(selectinload(User.roles))
            .where(
                func.lower(User.email) == email.strip().lower(),
                func.lower(User.role) == TRANSLATOR_LEGACY_ROLE,
            )
        )

    def accounts_by_email(self, emails: list[str]) -> dict[str, TranslatorAccountResponse]:
        normalized = {email.strip().lower() for email in emails}
        if not normalized:
            return {}
        self.tokens.expire_overdue()
        users = list(
            self.db.scalars(
                select(User).where(
                    func.lower(User.email).in_(normalized),
                    func.lower(User.role) == TRANSLATOR_LEGACY_ROLE,
                )
            ).all()
        )
        latest = self.tokens.latest_for_users([user.id for user in users])
        return {user.email.lower(): self._present(user, latest.get(user.id)) for user in users}

    def _present(self, user: User, token) -> TranslatorAccountResponse:
        return TranslatorAccountResponse(
            user_id=user.id,
            status=account_status(user),
            password_defined=user.password_set_at is not None,
            latest_link=(
                TranslatorAccountLinkResponse(
                    status=token.status,
                    sent_at=token.created_at,
                    expires_at=token.expires_at,
                    used_at=token.used_at,
                )
                if token is not None
                else None
            ),
        )

    def _translator_role(self) -> Role:
        roles = {
            role.name.strip().casefold(): role
            for role in self.db.scalars(select(Role).where(Role.is_active.is_(True))).all()
            if role.name.strip().casefold() in EXTERNAL_ROLE_NAMES
        }
        for name in TRANSLATOR_ROLE_PRIORITY:
            if name in roles:
                return roles[name]
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="O perfil Tradutor não está cadastrado ou está inativo",
        )

    def _require_admin_client(self) -> SupabaseAdminClient:
        if self.admin_client is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro interno do servidor",
            )
        return self.admin_client

    def _audit(
        self,
        user: User,
        actor: SupabaseAuthenticatedUser | None,
        action: str,
        before: dict[str, object] | None,
        after: dict[str, object] | None,
    ) -> None:
        record_authorization_change(
            self.db,
            target_type=AUDIT_TARGET_TYPE,
            target_id=user.id,
            target_name=user.email,
            action=action,
            actor_user_id=uuid.UUID(actor.id) if actor else None,
            actor_email=actor.email if actor else "",
            before=before,
            after=after,
        )
