from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.auth.exceptions.exceptions import (
    SupabaseAuthInvalidTokenError,
    SupabaseAuthUnexpectedError,
)
from app.modules.auth.models.user import User
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.auth.services.roles_service import (
    get_effective_permissions,
    has_permission,
)
from app.modules.auth.services.supabase_auth_client import SupabaseAuthClient
from app.shared.database import get_db
from app.shared.supabase.client import get_supabase_config

bearer_scheme = HTTPBearer()


def get_supabase_auth_client() -> SupabaseAuthClient:
    config = get_supabase_config()

    return SupabaseAuthClient(
        supabase_url=config.url,
        anon_key=config.anon_key,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    supabase_auth_client: SupabaseAuthClient = Depends(get_supabase_auth_client),
) -> SupabaseAuthenticatedUser:
    try:
        return supabase_auth_client.get_user(credentials.credentials)
    except SupabaseAuthInvalidTokenError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida ou expirada",
        ) from error
    except SupabaseAuthUnexpectedError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno do servidor",
        ) from error


def require_permission(permission_code: str, *, allow_full_access: bool = True):
    def dependency(
        current_user: SupabaseAuthenticatedUser = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> SupabaseAuthenticatedUser:
        user = db.scalar(
            select(User).options(selectinload(User.roles)).where(User.email == current_user.email)
        )
        has_required_permission = (
            permission_code in get_effective_permissions(user.roles)
            if user is not None and not allow_full_access
            else user is not None and has_permission(user.roles, permission_code)
        )
        if user is None or not user.is_active or not has_required_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário sem permissão para esta operação",
            )
        return current_user

    return dependency


def require_administrator(
    current_user: SupabaseAuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SupabaseAuthenticatedUser:
    user = db.scalar(
        select(User).options(selectinload(User.roles)).where(User.email == current_user.email)
    )
    has_full_access = (
        user is not None
        and user.is_active
        and any(
            role.is_active and role.name.strip().casefold() in {"administrador", "admin"}
            for role in user.roles
        )
    )
    if not has_full_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem realizar esta operação",
        )
    return current_user
