import asyncio
from collections.abc import Callable

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.auth.models.user import User
from app.shared.database import get_session_factory

SessionFactoryProvider = Callable[[], Callable[[], Session]]


def _buscar(email: str, provider: SessionFactoryProvider) -> User | None:
    if not isinstance(email, str) or not email.strip():
        return None
    db = provider()()
    try:
        return db.scalar(select(User).options(selectinload(User.roles)).where(User.email == email))
    finally:
        db.close()


async def carregar_usuario_por_email(
    email: str, provider: SessionFactoryProvider = get_session_factory
) -> User | None:
    return await asyncio.to_thread(_buscar, email, provider)
