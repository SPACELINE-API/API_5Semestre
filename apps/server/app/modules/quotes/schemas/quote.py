import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.quotes.schemas.translation_item import QuoteTranslationItemResponse


class QuoteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    company_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None


class QuoteStatusUpdate(BaseModel):
    status: str = Field(pattern="^(approved|reproved)$")
    reproval_reason: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def require_reproval_reason(self):
        if self.status == "reproved" and not (self.reproval_reason or "").strip():
            raise ValueError("Informe o motivo da reprovação.")
        return self


class QuoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    status: str
    service_order_id: uuid.UUID | None = None
    approved_at: datetime | None = None
    approved_by_email: str | None = None
    reproved_at: datetime | None = None
    reproved_by_email: str | None = None
    reproval_reason: str | None = None
    created_at: datetime
    updated_at: datetime


class QuoteManagerResponse(BaseModel):
    id: uuid.UUID
    request_id: uuid.UUID | None
    company_id: uuid.UUID | None
    contact_id: uuid.UUID | None
    status: str
    approved_at: datetime | None
    approved_by_email: str | None
    reproved_at: datetime | None
    reproved_by_email: str | None
    reproval_reason: str | None
    service_order_id: uuid.UUID | None = None
    customer_name: str | None
    enterprise: str | None
    email: str | None
    original_language: str | None
    translation_language: str | None
    customer_need: str | None
    created_at: datetime
    updated_at: datetime
    items: list[QuoteTranslationItemResponse]

    model_config = ConfigDict(from_attributes=True)


class QuoteListResponse(BaseModel):
    items: list[QuoteManagerResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class QuoteFromRequestResponse(BaseModel):
    id: uuid.UUID
    request_id: uuid.UUID
    company_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    status: str
    approved_at: datetime | None = None
    reproved_at: datetime | None = None
    reproval_reason: str | None = None
    customer_name: str
    enterprise: str
    email: str
    original_language: str
    translation_language: str
    customer_need: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
