from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.auth.dependencies import get_supabase_auth_client
from app.modules.auth.exceptions import (
    SupabaseAuthInvalidCredentialsError,
    SupabaseAuthUnexpectedError,
)
from app.modules.auth.models.user import User
from app.modules.auth.schemas.login import LoginRequest, LoginResponse, UserResponse
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
        session = supabase_auth_client.login_with_password(
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

    user = db.scalar(select(User).where(User.email == session.user.email))

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário sem permissão de acesso",
        )

    user.last_login_at = datetime.now(UTC)
    db.commit()

    return LoginResponse(
        access_token=session.access_token,
        token_type=session.token_type,
        expires_in=session.expires_in,
        user=UserResponse(
            id=str(user.id),
            email=user.email,
        ),
    )
