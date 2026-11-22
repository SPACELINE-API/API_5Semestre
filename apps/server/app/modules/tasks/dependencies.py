from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.auth.dependencies.dependencies import get_current_user, require_permission
from app.modules.auth.models.user import User
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.auth.services.roles_service import has_permission
from app.modules.tasks.services.task_rules import (
    TASKS_ASSIGNED_TO_ME_PERMISSION,
    TASKS_INTERNAL_CREATE_PERMISSION,
    TASKS_REVIEW_PERMISSION,
    TASKS_VIEW_PERMISSION,
    is_internal_user,
)
from app.shared.database import get_db


def _load_user(db: Session, current_user: SupabaseAuthenticatedUser) -> User | None:
    return db.scalar(
        select(User).options(selectinload(User.roles)).where(User.email == current_user.email)
    )


def _require_user_with(permission: str):
    checker = require_permission(permission)

    def dependency(
        current_user: SupabaseAuthenticatedUser = Depends(checker),
        db: Session = Depends(get_db),
    ) -> User:
        user = _load_user(db, current_user)
        # A PERMISSAO JA FOI VALIDADA; O USUARIO SO FALTA SE FOR REMOVIDO NO MEIO DA REQUISICAO
        if user is None or not user.is_active or not is_internal_user(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário sem permissão para esta operação",
            )
        return user

    return dependency


def _require_user_with_all(*permissions: str):
    def dependency(
        current_user: SupabaseAuthenticatedUser = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        user = _load_user(db, current_user)
        if (
            user is None
            or not user.is_active
            or not is_internal_user(user)
            or not all(has_permission(user.roles, permission) for permission in permissions)
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário sem permissão para esta operação",
            )
        return user

    return dependency


require_task_writer = _require_user_with_all(
    TASKS_VIEW_PERMISSION,
    TASKS_INTERNAL_CREATE_PERMISSION,
)
require_task_reviewer = _require_user_with_all(TASKS_VIEW_PERMISSION, TASKS_REVIEW_PERMISSION)
require_assigned_to_me_viewer = _require_user_with_all(
    TASKS_VIEW_PERMISSION,
    TASKS_ASSIGNED_TO_ME_PERMISSION,
)
require_task_viewer = _require_user_with(TASKS_VIEW_PERMISSION)
