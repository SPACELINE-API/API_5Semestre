import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.modules.auth.dependencies.dependencies import (
    get_supabase_admin_client,
    require_permission,
)
from app.modules.auth.models.roles import Role
from app.modules.auth.schemas.roles import RoleResponse
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.auth.services.supabase_admin_client import SupabaseAdminClient
from app.modules.internal_users.schemas.internal_user import (
    InternalUserCreate,
    InternalUserResponse,
    InternalUserRoleAdd,
    InternalUserUpdate,
    PasswordSetupLinkInfo,
    PasswordSetupRequest,
)
from app.modules.internal_users.services.identity_rules import EXTERNAL_ROLE_NAMES
from app.modules.internal_users.services.internal_user_service import InternalUserService
from app.modules.internal_users.services.password_setup_service import PasswordSetupService
from app.shared.database import get_db

router = APIRouter(prefix="/internal-users", tags=["internal-users"])
password_setup_router = APIRouter(prefix="/auth/password-setup", tags=["auth"])

DbSession = Annotated[Session, Depends(get_db)]
AdminClient = Annotated[SupabaseAdminClient, Depends(get_supabase_admin_client)]
UserReader = Annotated[SupabaseAuthenticatedUser, Depends(require_permission("users.read"))]
UserWriter = Annotated[SupabaseAuthenticatedUser, Depends(require_permission("users.write"))]


@router.post("", response_model=InternalUserResponse, status_code=status.HTTP_201_CREATED)
def create_internal_user(
    data: InternalUserCreate,
    db: DbSession,
    admin_client: AdminClient,
    actor: UserWriter,
) -> InternalUserResponse:
    return InternalUserService(db, admin_client).create(data, actor)


@router.get("/assignable-roles", response_model=list[RoleResponse])
def list_assignable_roles(
    db: DbSession,
    _actor: UserWriter,
) -> list[Role]:
    return list(
        db.scalars(
            select(Role)
            .options(selectinload(Role.permissions))
            .where(
                Role.is_active.is_(True),
                func.lower(func.trim(Role.name)).not_in(EXTERNAL_ROLE_NAMES),
            )
            .order_by(Role.name)
        ).all()
    )


@router.get("", response_model=list[InternalUserResponse])
def list_internal_users(
    db: DbSession,
    admin_client: AdminClient,
    _actor: UserReader,
    is_active: bool | None = None,
    search: Annotated[str | None, Query(max_length=255)] = None,
    role_id: uuid.UUID | None = None,
) -> list[InternalUserResponse]:
    return InternalUserService(db, admin_client).list_people(
        is_active=is_active, search=search, role_id=role_id
    )


@router.get("/{user_id}", response_model=InternalUserResponse)
def get_internal_user(
    user_id: uuid.UUID,
    db: DbSession,
    admin_client: AdminClient,
    _actor: UserReader,
) -> InternalUserResponse:
    return InternalUserService(db, admin_client).get(user_id)


@router.patch("/{user_id}", response_model=InternalUserResponse)
def update_internal_user(
    user_id: uuid.UUID,
    data: InternalUserUpdate,
    db: DbSession,
    admin_client: AdminClient,
    actor: UserWriter,
) -> InternalUserResponse:
    return InternalUserService(db, admin_client).update(user_id, data, actor)


@router.post("/{user_id}/deactivate", response_model=InternalUserResponse)
def deactivate_internal_user(
    user_id: uuid.UUID,
    db: DbSession,
    admin_client: AdminClient,
    actor: UserWriter,
) -> InternalUserResponse:
    return InternalUserService(db, admin_client).deactivate(user_id, actor)


@router.post(
    "/{user_id}/roles",
    response_model=InternalUserResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_internal_user_role(
    user_id: uuid.UUID,
    data: InternalUserRoleAdd,
    db: DbSession,
    admin_client: AdminClient,
    actor: UserWriter,
) -> InternalUserResponse:
    return InternalUserService(db, admin_client).add_role(user_id, data.role_id, actor)


@router.delete("/{user_id}/roles/{role_id}", response_model=InternalUserResponse)
def remove_internal_user_role(
    user_id: uuid.UUID,
    role_id: uuid.UUID,
    db: DbSession,
    admin_client: AdminClient,
    actor: UserWriter,
) -> InternalUserResponse:
    return InternalUserService(db, admin_client).remove_role(user_id, role_id, actor)


@router.post("/{user_id}/password-setup-link", response_model=InternalUserResponse)
def send_password_setup_link(
    user_id: uuid.UUID,
    db: DbSession,
    admin_client: AdminClient,
    actor: UserWriter,
) -> InternalUserResponse:
    return PasswordSetupService(db, admin_client).send_initial(user_id, actor)


@router.post("/{user_id}/password-setup-link/resend", response_model=InternalUserResponse)
def resend_password_setup_link(
    user_id: uuid.UUID,
    db: DbSession,
    admin_client: AdminClient,
    actor: UserWriter,
) -> InternalUserResponse:
    return PasswordSetupService(db, admin_client).resend(user_id, actor)


@password_setup_router.get("/{token}", response_model=PasswordSetupLinkInfo)
def get_password_setup_link(token: str, db: DbSession) -> PasswordSetupLinkInfo:
    return PasswordSetupService(db).describe(token)


@password_setup_router.post("")
def define_password(
    payload: PasswordSetupRequest,
    db: DbSession,
    admin_client: AdminClient,
) -> dict[str, str]:
    PasswordSetupService(db, admin_client).define_password(payload.token, payload.password)
    return {"message": "Senha definida com sucesso"}
