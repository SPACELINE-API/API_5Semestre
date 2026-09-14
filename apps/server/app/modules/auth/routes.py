from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.modules.auth.dependencies import get_supabase_auth_client
from app.modules.auth.exceptions import (
    AuthUserAccessDeniedError,
    SupabaseAuthInvalidCredentialsError,
    SupabaseAuthUnexpectedError,
)
from app.modules.auth.schemas.login import LoginRequest, LoginResponse
from app.modules.auth.services.login_service import LoginService
from app.modules.auth.services.supabase_auth_client import SupabaseAuthClient
from app.shared.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])
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
