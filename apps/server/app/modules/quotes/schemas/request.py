import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.modules.quotes.models.request import StatusEnum


class RequestCreate(BaseModel):
    company_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    customer_name: str = Field(..., max_length=255)
    enterprise: str = Field(..., max_length=155)
    email: str = Field(..., max_length=155, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    original_language: str = Field(..., max_length=50)
    translation_language: str = Field(..., max_length=50)
    customer_need: str = Field(..., max_length=100)
    document: bytes | None = None


class RequestStatusUpdate(BaseModel):
    status: StatusEnum
    reproval_reason: str | None = Field(default=None, max_length=500)

    @property
    def reason_is_required(self) -> bool:
        return self.status == StatusEnum.REPROVED and not self.reproval_reason


class RequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, ser_json_bytes="base64")

    id: uuid.UUID
    company_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    customer_name: str
    enterprise: str
    email: str
    original_language: str
    translation_language: str
    customer_need: str
    status: StatusEnum
    request_date: date
    approved_at: datetime | None = None
    reproved_at: datetime | None = None
    reproval_reason: str | None = None
    document: bytes | None = None
