import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database import Base

if TYPE_CHECKING:
    from app.modules.clients.models.company import Company
    from app.modules.contacts.models.contact import Contact
    from app.modules.quotes.models.request import Request
    from app.modules.quotes.models.translation_item import QuoteTranslationItem
    from app.modules.service_orders.models.service_order import ServiceOrder


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
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("company.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("contact.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    approved_by_email: Mapped[str | None] = mapped_column(String(255))
    reproved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reproved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    reproved_by_email: Mapped[str | None] = mapped_column(String(255))
    reproval_reason: Mapped[str | None] = mapped_column(String(500))
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
    company: Mapped["Company | None"] = relationship("Company")
    contact: Mapped["Contact | None"] = relationship("Contact")
    service_orders: Mapped[list["ServiceOrder"]] = relationship(
        "ServiceOrder", back_populates="quote", order_by="ServiceOrder.created_at.desc()"
    )

    @property
    def service_order_id(self) -> uuid.UUID | None:
        if self.status != "approved" or not self.service_orders:
            return None
        return self.service_orders[0].id
