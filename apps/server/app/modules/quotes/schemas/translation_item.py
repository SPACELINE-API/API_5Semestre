import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class QuoteTranslationItemCreate(BaseModel):
    source_language: str
    target_language: str
    document_type: str | None = None
    file_url: str | None = None
    estimated_value: Decimal | None = None


class QuoteTranslationItemUpdate(BaseModel):
    document_type: str | None = None
    file_url: str | None = None
    estimated_value: Decimal | None = None


class QuoteTranslationItemResponse(BaseModel):
    id: uuid.UUID
    quote_id: uuid.UUID
    source_language: str
    target_language: str
    document_type: str | None = None
    file_url: str | None = None
    estimated_value: Decimal | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
