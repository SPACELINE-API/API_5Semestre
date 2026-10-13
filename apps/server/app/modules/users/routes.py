from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.auth.dependencies.dependencies import require_permission
from app.modules.auth.models.authorization_audit import AuthorizationAuditLog
from app.modules.auth.models.roles import Role
from app.modules.auth.models.user import User
from app.modules.auth.schemas.authorization import (
    AuthenticatedRoleResponse,
    AuthorizationAuditResponse,
    UserAccessResponse,
    UserRolesUpdate,
)
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.auth.services.authorization_audit_service import record_authorization_change
from app.modules.auth.services.roles_service import get_effective_permissions
from app.shared.database import get_db

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserAccessResponse])
def list_users(
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission("users.read")),
) -> list[UserAccessResponse]:
    users = db.scalars(
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .order_by(User.email)
    ).all()
    return [_user_access_response(user) for user in users]


@router.get("/{user_id}", response_model=UserAccessResponse)
def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission("users.read")),
) -> UserAccessResponse:
    user = _load_user(db, user_id)
    return _user_access_response(user)


@router.put("/{user_id}/roles", response_model=UserAccessResponse)
def update_user_roles(
    user_id: UUID,
    payload: UserRolesUpdate,
    db: Session = Depends(get_db),
    current_user: SupabaseAuthenticatedUser = Depends(require_permission("users.write")),
) -> UserAccessResponse:
    user = _load_user(db, user_id)
    roles = list(db.scalars(select(Role).where(Role.id.in_(payload.role_ids))).all())
    if len(roles) != len(set(payload.role_ids)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role não encontrada")

    before = _user_roles_snapshot(user)
    user.roles = sorted(roles, key=lambda role: role.name)
    after = _user_roles_snapshot(user)
    if before != after:
        record_authorization_change(
            db,
            target_type="user",
            target_id=user.id,
            target_name=user.email,
            action="roles_updated",
            actor_user_id=UUID(current_user.id),
            actor_email=current_user.email,
            before=before,
            after=after,
        )
    db.commit()
    db.refresh(user)
    return _user_access_response(user)


@router.get("/{user_id}/authorization-audit", response_model=list[AuthorizationAuditResponse])
def list_user_authorization_audit(
    user_id: UUID,
    db: Session = Depends(get_db),
    _current_user=Depends(require_permission("users.read")),
) -> list[AuthorizationAuditLog]:
    _load_user(db, user_id)
    return list(
        db.scalars(
            select(AuthorizationAuditLog)
            .where(
                AuthorizationAuditLog.target_type == "user",
                AuthorizationAuditLog.target_id == user_id,
            )
            .order_by(AuthorizationAuditLog.created_at.desc())
        ).all()
    )


def _load_user(db: Session, user_id: UUID) -> User:
    user = db.scalar(
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .where(User.id == user_id)
    )
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")
    return user


def _user_roles_snapshot(user: User) -> dict[str, list[str]]:
    return {"roles": sorted(role.name for role in user.roles)}


def _user_access_response(user: User) -> UserAccessResponse:
    active_roles = sorted((role for role in user.roles if role.is_active), key=lambda role: role.name)
    return UserAccessResponse(
        id=user.id,
        email=user.email,
        roles=[AuthenticatedRoleResponse(id=role.id, name=role.name) for role in user.roles],
        permissions=sorted(get_effective_permissions(active_roles)),
    )
