import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.quotes.schemas.translation_item import QuoteTranslationItemResponse


class QuoteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    company_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None


class QuoteUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    company_id: uuid.UUID | None = None
    contact_id: uuid.UUID | None = None
    customer_name: str | None = Field(default=None, max_length=255)
    enterprise: str | None = Field(default=None, max_length=155)
    email: str | None = Field(default=None, max_length=155)
    original_language: str | None = Field(default=None, max_length=50)
    translation_language: str | None = Field(default=None, max_length=50)
    customer_need: str | None = Field(default=None, max_length=100)


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


class ProposalItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    customer_name: str | None = None
    enterprise: str | None = None
    original_language: str | None = None
    translation_language: str | None = None
    customer_need: str | None = None
    total_value: Decimal
    status: str
    created_at: datetime
    updated_at: datetime


class ProposalListResponse(BaseModel):
    items: list[ProposalItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
