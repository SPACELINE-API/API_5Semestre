import enum
import uuid
from datetime import date

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base

class StatusEnum(enum.StrEnum):
    PENDING = "pending"
    APPROVED = "approved"

class Request(Base):
    __tablename__ = "request"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    customer_name: Mapped[str] = mapped_column(String(255))

    enterprise: Mapped[str] = mapped_column(String(155))

    email: Mapped[str] = mapped_column(String(155))

    original_language: Mapped[str] = mapped_column(String(50))

    translation_language: Mapped[str] = mapped_column(String(50))

    customer_need: Mapped[str] = mapped_column(String(100))

    status: Mapped[StatusEnum] = mapped_column(
        SQLEnum(StatusEnum), 
        default=StatusEnum.PENDING
    )

    request_date: Mapped[date] = mapped_column(
        server_default=func.current_date()
    )