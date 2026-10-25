from sqlalchemy import Column, ForeignKey, Table
from sqlalchemy.dialects.postgresql import UUID

from app.shared.database import Base

task_translators = Table(
    "task_translators",
    Base.metadata,
    Column(
        "task_id", UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True
    ),
    Column(
        "translator_id",
        UUID(as_uuid=True),
        ForeignKey("translators.id", ondelete="RESTRICT"),
        primary_key=True,
    ),
)
