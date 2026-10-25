import uuid
from datetime import date, datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.modules.tasks.models.task_translator import task_translators
from app.shared.database import Base

if TYPE_CHECKING:
    from app.modules.auth.models.user import User
    from app.modules.translators.models.translator import Translator


class TaskStatus(StrEnum):
    PENDING = "pending"


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        UniqueConstraint("requester_id", "idempotency_key", name="uq_task_requester_idempotency"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        Enum(
            TaskStatus,
            name="task_status",
            values_callable=lambda status_enum: [item.value for item in status_enum],
        ),
        nullable=False,
        default=TaskStatus.PENDING,
    )
    requester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    idempotency_key: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    translators: Mapped[list["Translator"]] = relationship(
        secondary=task_translators, lazy="selectin"
    )
    requester: Mapped["User"] = relationship(lazy="joined")

    @property
    def translator_ids(self) -> list[uuid.UUID]:
        return [translator.id for translator in self.translators]
