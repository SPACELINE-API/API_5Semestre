import enum
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, LargeBinary, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database import Base

if TYPE_CHECKING:
    from app.modules.clients.models.company import Company
    from app.modules.contacts.models.contact import Contact
    from app.modules.quotes.models.quote import Quote


class StatusEnum(enum.StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REPROVED = "reproved"


class Request(Base):
    __tablename__ = "request"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("company.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    contact_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contact.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    customer_name: Mapped[str] = mapped_column(String(255))

    enterprise: Mapped[str] = mapped_column(String(155))

    email: Mapped[str] = mapped_column(String(155))

    original_language: Mapped[str] = mapped_column(String(50))

    translation_language: Mapped[str] = mapped_column(String(50))

    customer_need: Mapped[str] = mapped_column(String(100))

    status: Mapped[StatusEnum] = mapped_column(SQLEnum(StatusEnum), default=StatusEnum.PENDING)

    request_date: Mapped[date] = mapped_column(server_default=func.current_date())

    approved_at: Mapped[datetime | None]

    reproved_at: Mapped[datetime | None]

    reproval_reason: Mapped[str | None] = mapped_column(String(500))

    quote: Mapped["Quote | None"] = relationship("Quote", back_populates="request", uselist=False)
    company: Mapped["Company | None"] = relationship("Company")
    contact: Mapped["Contact | None"] = relationship("Contact")
    document: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
