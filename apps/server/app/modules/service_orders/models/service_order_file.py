import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database import Base

if TYPE_CHECKING:
    from app.modules.service_orders.models.service_order import ServiceOrder
    from app.modules.service_orders.models.service_order_delivery import ServiceOrderDelivery

DIRECTION_ENTRADA = "entrada"
DIRECTION_SAIDA = "saida"


class ServiceOrderFile(Base):
    __tablename__ = "service_order_files"
    __table_args__ = (
        CheckConstraint(
            "delivery_status IN ('not_sent', 'pending', 'sent', 'failed')",
            name="ck_service_order_files_delivery_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    service_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("service_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    content_type: Mapped[str | None] = mapped_column(String(150), nullable=True)
    direction: Mapped[str] = mapped_column(String(20), nullable=False)
    delivery_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="not_sent", server_default="not_sent"
    )

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    service_order: Mapped["ServiceOrder"] = relationship(
        "ServiceOrder",
        back_populates="files",
    )
    delivery_attempts: Mapped[list["ServiceOrderDelivery"]] = relationship(
        "ServiceOrderDelivery",
        back_populates="document",
        passive_deletes=True,
    )
