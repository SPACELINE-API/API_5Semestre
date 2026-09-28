from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.modules.auth.exceptions.exceptions import (
    SupabaseAuthInvalidTokenError,
    SupabaseAuthUnexpectedError,
)
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.auth.services.supabase_auth_client import SupabaseAuthClient
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
