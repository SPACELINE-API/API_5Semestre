import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database import Base

if TYPE_CHECKING:
    from app.modules.service_orders.models.service_order import ServiceOrder
    from app.modules.service_orders.models.service_order_file import ServiceOrderFile


class ServiceOrderDelivery(Base):
    __tablename__ = "service_order_deliveries"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'sent', 'failed')",
            name="ck_service_order_deliveries_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("service_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_file_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("service_order_files.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    recipient_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cc_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    template_key: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default="pending"
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    service_order: Mapped["ServiceOrder"] = relationship(back_populates="delivery_attempts")
    document: Mapped["ServiceOrderFile"] = relationship(back_populates="delivery_attempts")
