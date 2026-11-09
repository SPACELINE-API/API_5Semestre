import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.modules.internal_users.models.password_setup_token import (
    LINK_STATUS_EXPIRADO,
    LINK_STATUS_PENDENTE,
    LINK_STATUS_REJEITADO,
    PasswordSetupToken,
)


class PasswordSetupTokenRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_hash_for_update(self, token_hash: str) -> PasswordSetupToken | None:
        return self.db.scalar(
            select(PasswordSetupToken)
            .where(PasswordSetupToken.token_hash == token_hash)
            .with_for_update()
        )

    def get_by_hash(self, token_hash: str) -> PasswordSetupToken | None:
        return self.db.scalar(
            select(PasswordSetupToken).where(PasswordSetupToken.token_hash == token_hash)
        )

    def has_any(self, user_id: uuid.UUID) -> bool:
        return (
            self.db.scalar(
                select(PasswordSetupToken.id).where(PasswordSetupToken.user_id == user_id).limit(1)
            )
            is not None
        )

    def latest_for_users(self, user_ids: list[uuid.UUID]) -> dict[uuid.UUID, PasswordSetupToken]:
        if not user_ids:
            return {}
        tokens = self.db.scalars(
            select(PasswordSetupToken)
            .where(PasswordSetupToken.user_id.in_(user_ids))
            .order_by(PasswordSetupToken.user_id, PasswordSetupToken.created_at.desc())
            .distinct(PasswordSetupToken.user_id)
        ).all()
        return {token.user_id: token for token in tokens}

    def expire_overdue(self, user_id: uuid.UUID | None = None) -> int:
        statement = (
            update(PasswordSetupToken)
            .where(
                PasswordSetupToken.status == LINK_STATUS_PENDENTE,
                PasswordSetupToken.expires_at <= datetime.now(UTC),
            )
            .values(status=LINK_STATUS_EXPIRADO)
        )
        if user_id is not None:
            statement = statement.where(PasswordSetupToken.user_id == user_id)
        result = self.db.execute(statement.execution_options(synchronize_session="fetch"))
        return int(getattr(result, "rowcount", 0) or 0)

    def reject_pending(self, user_id: uuid.UUID) -> int:
        result = self.db.execute(
            update(PasswordSetupToken)
            .where(
                PasswordSetupToken.user_id == user_id,
                PasswordSetupToken.status == LINK_STATUS_PENDENTE,
            )
            .values(status=LINK_STATUS_REJEITADO)
            .execution_options(synchronize_session="fetch")
        )
        return int(getattr(result, "rowcount", 0) or 0)

    def add(self, token: PasswordSetupToken) -> PasswordSetupToken:
        self.db.add(token)
        self.db.flush()
        return token
