import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class GenerateServiceOrderRequest(BaseModel):
    quote_id: uuid.UUID
    company_id: uuid.UUID
    project_name: str = Field(min_length=1, max_length=150)
    deadline: datetime | None = None


class ServiceOrderItemResponse(BaseModel):
    id: uuid.UUID
    service_order_id: uuid.UUID
    quote_translation_item_id: uuid.UUID
    translator_id: uuid.UUID | None
    source_language: str
    target_language: str
    document_type: str | None
    price: Decimal | None
    deadline: datetime | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ServiceOrderResponse(BaseModel):
    id: uuid.UUID
    quote_id: uuid.UUID
    company_id: uuid.UUID
    project_name: str
    deadline: datetime | None
    status: str
    items: list[ServiceOrderItemResponse]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
