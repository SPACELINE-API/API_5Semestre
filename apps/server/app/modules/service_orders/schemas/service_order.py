import uuid
from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, field_validator

SAO_PAULO_TIMEZONE = ZoneInfo("America/Sao_Paulo")


def _validate_deadline_not_in_past(value: datetime | None) -> datetime | None:
    if value is not None and value.date() < datetime.now(SAO_PAULO_TIMEZONE).date():
        raise ValueError("O prazo não pode ser anterior à data de hoje.")
    return value


class GenerateServiceOrderRequest(BaseModel):
    quote_id: uuid.UUID
    company_id: uuid.UUID
    project_name: str = Field(min_length=1, max_length=150)
    deadline: datetime | None = None
    domain_area: str | None = None
    price_category: str | None = None
    internal_notes: str | None = None
    external_notes: str | None = None

    @field_validator("deadline")
    @classmethod
    def validate_deadline(cls, value: datetime | None) -> datetime | None:
        return _validate_deadline_not_in_past(value)


class UpdateServiceOrderRequest(BaseModel):
    project_name: str | None = Field(default=None, min_length=1, max_length=150)
    deadline: datetime | None = None
    domain_area: str | None = None
    price_category: str | None = None
    internal_notes: str | None = None
    external_notes: str | None = None

    @field_validator("deadline")
    @classmethod
    def validate_deadline(cls, value: datetime | None) -> datetime | None:
        return _validate_deadline_not_in_past(value)


class ServiceOrderItemResponse(BaseModel):
    id: uuid.UUID
    service_order_id: uuid.UUID
    quote_translation_item_id: uuid.UUID | None
    translator_id: uuid.UUID | None
    source_language: str
    target_language: str
    document_type: str | None
    file_url: str | None
    word_count: int | None
    price: Decimal | None
    deadline: datetime | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CreateServiceOrderItemRequest(BaseModel):
    source_language: str = Field(min_length=1, max_length=10)
    target_language: str = Field(min_length=1, max_length=10)
    document_type: str | None = None
    word_count: int | None = Field(default=None, ge=0)
    price: Decimal | None = None
    deadline: datetime | None = None


class UpdateServiceOrderItemRequest(BaseModel):
    source_language: str | None = Field(default=None, min_length=1, max_length=10)
    target_language: str | None = Field(default=None, min_length=1, max_length=10)
    document_type: str | None = None
    word_count: int | None = Field(default=None, ge=0)
    price: Decimal | None = None
    deadline: datetime | None = None


class ServiceOrderFileResponse(BaseModel):
    id: uuid.UUID
    service_order_id: uuid.UUID
    filename: str
    file_url: str
    direction: str
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ServiceOrderResponse(BaseModel):
    id: uuid.UUID
    quote_id: uuid.UUID
    company_id: uuid.UUID
    project_name: str
    deadline: datetime | None
    domain_area: str | None
    price_category: str | None
    internal_notes: str | None
    external_notes: str | None
    status: str
    items: list[ServiceOrderItemResponse]
    files: list[ServiceOrderFileResponse]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
