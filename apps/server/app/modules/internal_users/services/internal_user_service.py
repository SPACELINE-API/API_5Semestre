import secrets
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
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
from app.modules.internal_users.schemas.internal_user import (
    InternalUserCreate,
    InternalUserResponse,
    InternalUserUpdate,
)
from app.modules.internal_users.services.identity_rules import (
    EMAIL_ALREADY_REGISTERED,
    INTERNAL_USER_LEGACY_ROLE,
    TRANSLATOR_LEGACY_ROLE,
    ensure_email_available,
    ensure_internal_roles,
)
from app.modules.internal_users.services.presenter import (
    present_user,
    roles_snapshot,
    user_snapshot,
)

UNUSABLE_PASSWORD_HASH = "!"

AUDIT_TARGET_TYPE = "user"
ACTION_CREATED = "internal_user_created"
ACTION_UPDATED = "internal_user_updated"
ACTION_DEACTIVATED = "internal_user_deactivated"
ACTION_ROLE_ADDED = "internal_user_role_added"
ACTION_ROLE_REMOVED = "internal_user_role_removed"


class InternalUserService:
    def __init__(self, db: Session, admin_client: SupabaseAdminClient):
        self.db = db
        self.admin_client = admin_client
        self.tokens = PasswordSetupTokenRepository(db)

    def create(
        self, data: InternalUserCreate, actor: SupabaseAuthenticatedUser
    ) -> InternalUserResponse:
        ensure_email_available(self.db, data.email)
        roles = self._load_roles(data.role_ids)
        ensure_internal_roles(roles)

        try:
            auth_user = self.admin_client.create_or_get_user(data.email, secrets.token_urlsafe(32))
        except SupabaseAdminUnexpectedError as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Não foi possível criar a conta de acesso",
            ) from error

        user = User(
            id=uuid.UUID(str(auth_user["id"])),
            email=data.email,
            name=data.name,
            phone=data.phone,
            password_hash=UNUSABLE_PASSWORD_HASH,
            is_active=False,
            role=INTERNAL_USER_LEGACY_ROLE,
            roles=sorted(roles, key=lambda role: role.name),
        )
        self.db.add(user)
        try:
            self.db.flush()
        except IntegrityError as error:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=EMAIL_ALREADY_REGISTERED
            ) from error
        self.record_audit(user, actor, ACTION_CREATED, None, user_snapshot(user))
        self.db.commit()
        return self._present(user)

    def list_people(
        self,
        *,
        is_active: bool | None = None,
        search: str | None = None,
        role_id: uuid.UUID | None = None,
    ) -> list[InternalUserResponse]:
        self.tokens.expire_overdue()
        self.db.commit()
        statement = self._internal_users_statement().order_by(func.lower(User.email))
        if is_active is not None:
            statement = statement.where(User.is_active == is_active)
        if search:
            pattern = f"%{search.strip().lower()}%"
            statement = statement.where(
                or_(func.lower(User.email).like(pattern), func.lower(User.name).like(pattern))
            )
        if role_id is not None:
            statement = statement.where(User.roles.any(Role.id == role_id))
        users = list(self.db.scalars(statement).all())
        latest = self.tokens.latest_for_users([user.id for user in users])
        return [present_user(user, latest.get(user.id)) for user in users]

    def get(self, user_id: uuid.UUID) -> InternalUserResponse:
        self.tokens.expire_overdue(user_id)
        self.db.commit()
        return self._present(self.load_user(user_id))

    def update(
        self, user_id: uuid.UUID, data: InternalUserUpdate, actor: SupabaseAuthenticatedUser
    ) -> InternalUserResponse:
        user = self.load_user(user_id)
        before = user_snapshot(user)

        if data.email is not None and data.email != user.email:
            if user.password_set_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="O e-mail só pode ser alterado enquanto a conta aguarda a senha",
                )
            ensure_email_available(self.db, data.email, exclude_user_id=user.id)
            try:
                self.admin_client.update_user(str(user.id), email=data.email)
            except SupabaseAdminUnexpectedError as error:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Não foi possível atualizar a conta de acesso",
                ) from error
            user.email = data.email
            self.tokens.reject_pending(user.id)
        if data.name is not None:
            user.name = data.name
        if data.phone is not None:
            user.phone = data.phone

        after = user_snapshot(user)
        if before != after:
            self.record_audit(user, actor, ACTION_UPDATED, before, after)
        self._commit_unique()
        self.db.refresh(user)
        return self._present(user)

    def deactivate(
        self, user_id: uuid.UUID, actor: SupabaseAuthenticatedUser
    ) -> InternalUserResponse:
        user = self.load_user(user_id)
        if str(user.id) == actor.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Você não pode desativar a sua própria conta",
            )
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Conta já inativa")

        before = user_snapshot(user)
        user.is_active = False
        self.record_audit(user, actor, ACTION_DEACTIVATED, before, user_snapshot(user))
        self.db.commit()
        self.db.refresh(user)
        return self._present(user)

    def add_role(
        self, user_id: uuid.UUID, role_id: uuid.UUID, actor: SupabaseAuthenticatedUser
    ) -> InternalUserResponse:
        user = self.load_user(user_id)
        role = self._load_roles([role_id])[0]
        ensure_internal_roles([role])
        if any(existing.id == role.id for existing in user.roles):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Perfil já associado a esta pessoa",
            )

        before = roles_snapshot(user)
        user.roles = sorted([*user.roles, role], key=lambda item: item.name)
        self.record_audit(user, actor, ACTION_ROLE_ADDED, before, roles_snapshot(user))
        self.db.commit()
        self.db.refresh(user)
        return self._present(user)

    def remove_role(
        self, user_id: uuid.UUID, role_id: uuid.UUID, actor: SupabaseAuthenticatedUser
    ) -> InternalUserResponse:
        user = self.load_user(user_id)
        if not any(role.id == role_id for role in user.roles):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Perfil não associado a esta pessoa",
            )
        if len(user.roles) == 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A pessoa precisa manter ao menos um perfil",
            )

        before = roles_snapshot(user)
        user.roles = [role for role in user.roles if role.id != role_id]
        self.record_audit(user, actor, ACTION_ROLE_REMOVED, before, roles_snapshot(user))
        self.db.commit()
        self.db.refresh(user)
        return self._present(user)

    def load_user(self, user_id: uuid.UUID) -> User:
        user = self.db.scalar(self._internal_users_statement().where(User.id == user_id))
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Pessoa não encontrada"
            )
        return user

    def _internal_users_statement(self):
        return (
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .where(func.lower(User.role) != TRANSLATOR_LEGACY_ROLE)
        )

    def _load_roles(self, role_ids: list[uuid.UUID]) -> list[Role]:
        unique_ids = set(role_ids)
        roles = list(self.db.scalars(select(Role).where(Role.id.in_(unique_ids))).all())
        if len(roles) != len(unique_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Perfil não encontrado"
            )
        return roles

    def _present(self, user: User) -> InternalUserResponse:
        return present_user(user, self.tokens.latest_for_users([user.id]).get(user.id))

    def _commit_unique(self) -> None:
        try:
            self.db.commit()
        except IntegrityError as error:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail=EMAIL_ALREADY_REGISTERED
            ) from error

    def record_audit(
        self,
        user: User,
        actor: SupabaseAuthenticatedUser,
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
            actor_user_id=uuid.UUID(actor.id),
            actor_email=actor.email,
            before=before,
            after=after,
        )
