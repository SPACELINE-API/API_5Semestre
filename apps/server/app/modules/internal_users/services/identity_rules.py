import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.auth.models.roles import Role
from app.modules.auth.models.user import User
from app.modules.translators.models.translator import Translator

INTERNAL_USER_LEGACY_ROLE = "interno"
TRANSLATOR_LEGACY_ROLE = "tradutor"
EXTERNAL_ROLE_NAMES = frozenset({"tradutor", "tradutora", "recursos externos"})

EMAIL_ALREADY_REGISTERED = "E-mail já cadastrado"


def is_external_role(role: Role) -> bool:
    return role.name.strip().casefold() in EXTERNAL_ROLE_NAMES


def ensure_internal_roles(roles: list[Role]) -> None:
    if any(is_external_role(role) for role in roles):
        raise HTTPException(
            status_code=422,
            detail="O perfil Tradutor não pode ser associado a pessoas internas",
        )
    if any(not role.is_active for role in roles):
        raise HTTPException(
            status_code=422,
            detail="Não é possível associar um perfil inativo",
        )


def email_used_by_translator_or_user(
    db: Session, email: str, *, exclude_user_id: uuid.UUID | None = None
) -> bool:
    normalized = email.strip().lower()
    translator_id = db.scalar(
        select(Translator.id).where(func.lower(Translator.email) == normalized).limit(1)
    )
    if translator_id is not None:
        return True
    user_query = select(User.id).where(func.lower(User.email) == normalized)
    if exclude_user_id is not None:
        user_query = user_query.where(User.id != exclude_user_id)
    return db.scalar(user_query.limit(1)) is not None


def ensure_email_available(
    db: Session, email: str, *, exclude_user_id: uuid.UUID | None = None
) -> None:
    if email_used_by_translator_or_user(db, email, exclude_user_id=exclude_user_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=EMAIL_ALREADY_REGISTERED)


def email_used_by_internal_user(db: Session, email: str) -> bool:
    return (
        db.scalar(
            select(User.id)
            .where(
                func.lower(User.email) == email.strip().lower(),
                func.lower(User.role) != TRANSLATOR_LEGACY_ROLE,
            )
            .limit(1)
        )
        is not None
    )
