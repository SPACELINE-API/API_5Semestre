from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.auth.dependencies.dependencies import get_current_user, require_permission
from app.modules.auth.models.user import User
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.tasks.services.task_rules import (
    TASKS_REVIEW_PERMISSION,
    TASKS_WRITE_PERMISSION,
    is_internal_user,
)
from app.shared.database import get_db


def _load_user(db: Session, current_user: SupabaseAuthenticatedUser) -> User | None:
    return db.scalar(
        select(User).options(selectinload(User.roles)).where(User.email == current_user.email)
    )


# QUALQUER FUNCIONARIO INTERNO ATIVO CONSULTA E EXECUTA AS PROPRIAS TAREFAS
def get_current_internal_user(
    current_user: SupabaseAuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    user = _load_user(db, current_user)
    if user is None or not user.is_active or not is_internal_user(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas funcionários internos ativos podem acessar tarefas",
        )
    return user


def _require_user_with(permission: str):
    checker = require_permission(permission)

    def dependency(
        current_user: SupabaseAuthenticatedUser = Depends(checker),
        db: Session = Depends(get_db),
    ) -> User:
        user = _load_user(db, current_user)
        # A PERMISSAO JA FOI VALIDADA; O USUARIO SO FALTA SE FOR REMOVIDO NO MEIO DA REQUISICAO
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário sem permissão para esta operação",
            )
        return user

    return dependency


require_task_writer = _require_user_with(TASKS_WRITE_PERMISSION)
require_task_reviewer = _require_user_with(TASKS_REVIEW_PERMISSION)
