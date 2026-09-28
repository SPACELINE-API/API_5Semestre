import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database import Base

if TYPE_CHECKING:
    from app.modules.service_orders.models.service_order_item import ServiceOrderItem

INVITE_STATUS_PENDENTE = "pendente"
INVITE_STATUS_ACEITO = "aceito"
INVITE_STATUS_RECUSADO = "recusado"
INVITE_STATUS_EXPIRADO = "expirado"


class ServiceOrderItemInvite(Base):
    __tablename__ = "service_order_item_invites"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    service_order_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("service_order_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    translator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("translators.id"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=INVITE_STATUS_PENDENTE)

    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    service_order_item: Mapped["ServiceOrderItem"] = relationship(
        "ServiceOrderItem",
        back_populates="invites",
    )
    translator = relationship("Translator")
