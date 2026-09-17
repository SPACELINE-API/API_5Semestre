from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.modules.auth.dependencies.dependencies import get_supabase_auth_client
from app.modules.auth.exceptions.exceptions import (
    AuthUserAccessDeniedError,
    SupabaseAuthInvalidCredentialsError,
    SupabaseAuthInvalidRecoveryTokenError,
    SupabaseAuthUnexpectedError,
)
from app.modules.auth.schemas.login import (
    LoginRequest,
    LoginResponse,
    PasswordRecoveryRequest,
    PasswordResetRequest,
)
from app.modules.auth.services.login_service import LoginService
from app.modules.auth.services.supabase_auth_client import SupabaseAuthClient
from app.shared.database import get_db
from app.shared.EnvProvider import env_provider

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
