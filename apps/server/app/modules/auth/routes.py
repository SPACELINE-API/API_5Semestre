from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.auth.dependencies.dependencies import (
    get_supabase_auth_client,
    require_administrator,
    require_permission,
)
from app.modules.auth.exceptions.exceptions import (
    AuthUserAccessDeniedError,
    SupabaseAuthInvalidCredentialsError,
    SupabaseAuthInvalidRecoveryTokenError,
    SupabaseAuthUnexpectedError,
)
from app.modules.auth.models.roles import Permission, Role
from app.modules.auth.schemas.login import (
    LoginRequest,
    LoginResponse,
    PasswordRecoveryRequest,
    PasswordResetRequest,
)
from app.modules.auth.schemas.roles import (
    RoleCreate,
    RoleResponse,
    RoleStatusUpdate,
    RoleUpdate,
)
from app.modules.auth.services.login_service import LoginService
from app.modules.auth.services.supabase_auth_client import SupabaseAuthClient
from app.shared.database import get_db
from app.shared.EnvProvider import env_provider

router = APIRouter(prefix="/auth", tags=["auth"])
roles_router = APIRouter(prefix="/roles", tags=["roles"])
db_dependency = Depends(get_db)
supabase_auth_dependency = Depends(get_supabase_auth_client)


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
    _current_user=Depends(require_permission("roles.read")),
) -> list[Role]:
    return list(db.scalars(select(Role).order_by(Role.name)).all())


@roles_router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(
    payload: RoleCreate,
    db: Session = db_dependency,
    _current_user=Depends(require_administrator),
) -> Role:
    role = Role(
        name=payload.name,
        description=payload.description,
        permissions=_load_permissions(db, payload.permission_ids),
    )
    db.add(role)
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
    _current_user=Depends(require_permission("roles.read")),
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
    _current_user=Depends(require_administrator),
) -> Role:
    role = db.get(Role, role_id)
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role não encontrada")

    if payload.name is not None:
        role.name = payload.name
    if payload.description is not None:
        role.description = payload.description
    if payload.permission_ids is not None:
        role.permissions = _load_permissions(db, payload.permission_ids)

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
    _current_user=Depends(require_administrator),
) -> Role:
    role = db.get(Role, role_id)
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role não encontrada")

    role.is_active = payload.is_active
    db.commit()
    db.refresh(role)
    return role
