from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.modules.auth.dependencies.dependencies import (
    get_current_user,
    get_supabase_auth_client,
    require_permission,
)
from app.modules.auth.exceptions.exceptions import (
    AuthUserAccessDeniedError,
    SupabaseAuthInvalidCredentialsError,
    SupabaseAuthInvalidRecoveryTokenError,
    SupabaseAuthUnexpectedError,
)
from app.modules.auth.models.authorization_audit import AuthorizationAuditLog
from app.modules.auth.models.roles import Permission, Role
from app.modules.auth.models.user import User
from app.modules.auth.schemas.authorization import (
    AuthenticatedAccessResponse,
    AuthenticatedRoleResponse,
    AuthenticatedUserResponse,
    AuthorizationAuditResponse,
)
from app.modules.auth.schemas.login import (
    LoginRequest,
    LoginResponse,
    PasswordRecoveryRequest,
    PasswordResetRequest,
)
from app.modules.auth.schemas.roles import (
    PermissionResponse,
    RoleCreate,
    RoleResponse,
    RoleStatusUpdate,
    RoleUpdate,
)
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.auth.services.authorization_audit_service import record_authorization_change
from app.modules.auth.services.login_service import LoginService
from app.modules.auth.services.roles_service import get_effective_permissions
from app.modules.auth.services.supabase_auth_client import SupabaseAuthClient
from app.shared.database import get_db
from app.shared.EnvProvider import env_provider

router = APIRouter(prefix="/auth", tags=["auth"])
roles_router = APIRouter(prefix="/roles", tags=["roles"])
db_dependency = Depends(get_db)
supabase_auth_dependency = Depends(get_supabase_auth_client)
roles_read_permission = require_permission("roles.read")
roles_write_permission = require_permission("roles.write")


@router.post("/login", response_model=LoginResponse)
def login(
    credentials: LoginRequest,
    db: Session = db_dependency,
    supabase_auth_client: SupabaseAuthClient = supabase_auth_dependency,
) -> LoginResponse:
    try:
        return LoginService(db, supabase_auth_client).login(
            credentials.email,
            credentials.password,
        )
    except SupabaseAuthInvalidCredentialsError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
        ) from error
    except SupabaseAuthUnexpectedError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno do servidor",
        ) from error
    except AuthUserAccessDeniedError as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário sem permissão de acesso",
        ) from error


@router.get("/me", response_model=AuthenticatedAccessResponse)
def get_authenticated_access(
    current_user: SupabaseAuthenticatedUser = Depends(get_current_user),
    db: Session = db_dependency,
) -> AuthenticatedAccessResponse:
    user = db.scalar(
        select(User)
        .options(selectinload(User.roles).selectinload(Role.permissions))
        .where(User.email == current_user.email)
    )
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário sem permissão de acesso",
        )

    active_roles = [role for role in user.roles if role.is_active]
    return AuthenticatedAccessResponse(
        user=AuthenticatedUserResponse(id=user.id, email=user.email),
        roles=[AuthenticatedRoleResponse(id=role.id, name=role.name) for role in active_roles],
        permissions=sorted(get_effective_permissions(active_roles)),
    )


@router.post("/password-recovery")
def request_password_recovery(
    payload: PasswordRecoveryRequest,
    supabase_auth_client: SupabaseAuthClient = supabase_auth_dependency,
) -> dict[str, str]:
    try:
        supabase_auth_client.request_password_recovery(
            payload.email,
            f"{env_provider.get_site_url().rstrip('/')}/login",
        )
    except SupabaseAuthUnexpectedError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível solicitar a recuperação de senha",
        ) from error

    return {"message": "E-mail enviado para o destinatário."}


@router.post("/password-reset")
def reset_password(
    payload: PasswordResetRequest,
    supabase_auth_client: SupabaseAuthClient = supabase_auth_dependency,
) -> dict[str, str]:
    try:
        supabase_auth_client.update_password(payload.access_token, payload.password)
    except SupabaseAuthInvalidRecoveryTokenError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Link de recuperação inválido ou expirado",
        ) from error
    except SupabaseAuthUnexpectedError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível atualizar a senha",
        ) from error

    return {"message": "Senha atualizada com sucesso"}


def _load_permissions(db: Session, permission_ids: list[UUID]) -> list[Permission]:
    if not permission_ids:
        return []

    permissions = list(
        db.scalars(select(Permission).where(Permission.id.in_(permission_ids))).all()
    )
    if len(permissions) != len(set(permission_ids)):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Permissão não encontrada"
        )
    return permissions


@roles_router.get("", response_model=list[RoleResponse])
def list_roles(
    db: Session = db_dependency,
    _current_user=Depends(roles_read_permission),
) -> list[Role]:
    return list(db.scalars(select(Role).order_by(Role.name)).all())


@roles_router.get("/permissions", response_model=list[PermissionResponse])
def list_permissions(
    db: Session = db_dependency,
    _current_user=Depends(roles_read_permission),
) -> list[Permission]:
    return list(db.scalars(select(Permission).order_by(Permission.code)).all())


@roles_router.get("/audit", response_model=list[AuthorizationAuditResponse])
def list_authorization_audit(
    target_type: str | None = None,
    target_id: UUID | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = db_dependency,
    _current_user=Depends(roles_read_permission),
) -> list[AuthorizationAuditLog]:
    if target_type not in (None, "role", "user"):
        raise HTTPException(status_code=422, detail="target_type deve ser role ou user")
    statement = select(AuthorizationAuditLog)
    if target_type is not None:
        statement = statement.where(AuthorizationAuditLog.target_type == target_type)
    if target_id is not None:
        statement = statement.where(AuthorizationAuditLog.target_id == target_id)
    return list(
        db.scalars(
            statement.order_by(desc(AuthorizationAuditLog.created_at)).limit(limit)
        ).all()
    )


@roles_router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(
    payload: RoleCreate,
    db: Session = db_dependency,
    current_user: SupabaseAuthenticatedUser = Depends(roles_write_permission),
) -> Role:
    role = Role(
        name=payload.name,
        description=payload.description,
        permissions=_load_permissions(db, payload.permission_ids),
        created_by=UUID(current_user.id),
    )
    db.add(role)
    db.flush()
    record_authorization_change(
        db,
        target_type="role",
        target_id=role.id,
        target_name=role.name,
        action="created",
        actor_user_id=UUID(current_user.id),
        actor_email=current_user.email,
        before=None,
        after=_role_snapshot(role),
    )
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Role já cadastrada"
        ) from error
    db.refresh(role)
    return role


@roles_router.get("/{role_id}", response_model=RoleResponse)
def get_role(
    role_id: UUID,
    db: Session = db_dependency,
    _current_user=Depends(roles_read_permission),
) -> Role:
    role = db.get(Role, role_id)
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role não encontrada")
    return role


@roles_router.patch("/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: UUID,
    payload: RoleUpdate,
    db: Session = db_dependency,
    current_user: SupabaseAuthenticatedUser = Depends(roles_write_permission),
) -> Role:
    role = db.get(Role, role_id)
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role não encontrada")

    previous = _role_snapshot(role)
    if payload.name is not None:
        role.name = payload.name
    if payload.description is not None:
        role.description = payload.description
    if payload.permission_ids is not None:
        role.permissions = _load_permissions(db, payload.permission_ids)

    current = _role_snapshot(role)
    if current != previous:
        record_authorization_change(
            db,
            target_type="role",
            target_id=role.id,
            target_name=role.name,
            action="updated",
            actor_user_id=UUID(current_user.id),
            actor_email=current_user.email,
            before=previous,
            after=current,
        )

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Role já cadastrada"
        ) from error
    db.refresh(role)
    return role


@roles_router.patch("/{role_id}/status", response_model=RoleResponse)
def update_role_status(
    role_id: UUID,
    payload: RoleStatusUpdate,
    db: Session = db_dependency,
    current_user: SupabaseAuthenticatedUser = Depends(roles_write_permission),
) -> Role:
    role = db.get(Role, role_id)
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role não encontrada")

    previous = _role_snapshot(role)
    role.is_active = payload.is_active
    current = _role_snapshot(role)
    if previous != current:
        record_authorization_change(
            db,
            target_type="role",
            target_id=role.id,
            target_name=role.name,
            action="status_updated",
            actor_user_id=UUID(current_user.id),
            actor_email=current_user.email,
            before=previous,
            after=current,
        )
    db.commit()
    db.refresh(role)
    return role


def _role_snapshot(role: Role) -> dict[str, object]:
    return {
        "name": role.name,
        "description": role.description,
        "is_active": role.is_active,
        "permissions": sorted(permission.code for permission in role.permissions),
    }
