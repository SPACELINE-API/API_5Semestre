import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base

LINK_STATUS_PENDENTE = "pendente"
LINK_STATUS_ACEITO = "aceito"
LINK_STATUS_REJEITADO = "rejeitado"
LINK_STATUS_EXPIRADO = "expirado"

PASSWORD_SETUP_LINK_VALIDITY_DAYS = 3


class PasswordSetupToken(Base):
    __tablename__ = "password_setup_tokens"
    __table_args__ = (
        Index("ix_password_setup_tokens_user_status", "user_id", "status"),
        Index(
            "ux_password_setup_tokens_one_pending",
            "user_id",
            unique=True,
            postgresql_where=text("status = 'pendente'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=LINK_STATUS_PENDENTE)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sent_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
