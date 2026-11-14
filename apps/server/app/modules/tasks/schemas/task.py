import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.tasks.models.task import TaskStatus


def _strip_required(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError("Value cannot be blank")
    return normalized


# DADOS DE CRIACAO USADOS PELO ENDPOINT E PELO AGENTE DE IA
class TaskCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1, max_length=5000)
    due_date: date | None = None
    assignee_id: uuid.UUID
    idempotency_key: str = Field(min_length=1, max_length=255)

    @field_validator("description", "idempotency_key")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        return _strip_required(value)


# CORPO DO ENDPOINT; SEM CHAVE DE IDEMPOTENCIA, CADA CHAMADA CRIA UMA NOVA TAREFA
class TaskCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str = Field(min_length=1, max_length=5000)
    due_date: date | None = None
    assignee_id: uuid.UUID
    idempotency_key: str | None = Field(default=None, min_length=1, max_length=255)

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str) -> str:
        return _strip_required(value)


class TaskExecutionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    execution_description: str = Field(min_length=1, max_length=5000)

    @field_validator("execution_description")
    @classmethod
    def strip_description(cls, value: str) -> str:
        return _strip_required(value)


class TaskRejectInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(min_length=1, max_length=2000)

    @field_validator("reason")
    @classmethod
    def strip_reason(cls, value: str) -> str:
        return _strip_required(value)


class TaskPersonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str | None
    email: str


class TaskAttachmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    content_type: str
    size_bytes: int
    uploaded_by_id: uuid.UUID | None
    created_at: datetime


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    description: str
    due_date: date | None
    status: TaskStatus
    requester_id: uuid.UUID
    assignee_id: uuid.UUID
    requester: TaskPersonResponse
    assignee: TaskPersonResponse
    execution_description: str | None
    rejection_reason: str | None
    reviewed_at: datetime | None
    attachments: list[TaskAttachmentResponse]
    created_at: datetime
    updated_at: datetime


class TaskHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    action: str
    from_status: TaskStatus | None
    to_status: TaskStatus | None
    actor_id: uuid.UUID | None
    details: dict[str, Any]
    created_at: datetime


class TaskFileResponse(BaseModel):
    url: str
    expires_in: int
