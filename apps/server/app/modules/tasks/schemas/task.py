import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.tasks.models.task import TaskStatus


class TaskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1, max_length=5000)
    due_date: date | None = None
    translator_ids: list[uuid.UUID] = Field(min_length=1)
    idempotency_key: str = Field(min_length=1, max_length=255)

    @field_validator("description", "idempotency_key")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Value cannot be blank")
        return normalized

    @field_validator("translator_ids")
    @classmethod
    def reject_duplicate_translators(cls, value: list[uuid.UUID]) -> list[uuid.UUID]:
        if len(value) != len(set(value)):
            raise ValueError("Translator IDs must be unique")
        return value


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    description: str
    due_date: date | None
    status: TaskStatus
    requester_id: uuid.UUID
    idempotency_key: str
    created_at: datetime
    translator_ids: list[uuid.UUID]
