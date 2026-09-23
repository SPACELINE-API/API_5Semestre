import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database import Base

if TYPE_CHECKING:
    from app.modules.quotes.models.request import Request
    from app.modules.quotes.models.translation_item import QuoteTranslationItem


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    request_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("request.id", ondelete="RESTRICT"), nullable=True, unique=True
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    enterprise: Mapped[str | None] = mapped_column(String(155), nullable=True)
    email: Mapped[str | None] = mapped_column(String(155), nullable=True)
    original_language: Mapped[str | None] = mapped_column(String(50), nullable=True)
    translation_language: Mapped[str | None] = mapped_column(String(50), nullable=True)
    customer_need: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    items: Mapped[list["QuoteTranslationItem"]] = relationship(
        "QuoteTranslationItem",
        back_populates="quote",
        cascade="all, delete-orphan",
    )

    request: Mapped["Request"] = relationship("Request", back_populates="quote")
