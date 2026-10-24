import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.database import Base


class TaskProposalStatus(StrEnum):
    PENDING = "pending"
    CONSUMED = "consumed"


class TaskProposal(Base):
    __tablename__ = "task_proposals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    requester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[TaskProposalStatus] = mapped_column(
        Enum(
            TaskProposalStatus,
            name="task_proposal_status",
            values_callable=lambda status_enum: [item.value for item in status_enum],
        ),
        nullable=False,
        default=TaskProposalStatus.PENDING,
    )
    task_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
