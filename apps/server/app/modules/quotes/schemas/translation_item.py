import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class QuoteTranslationItemCreate(BaseModel):
    source_language: str
    target_language: str
    document_type: str | None = None
    file_url: str | None = None
    word_count: int | None = Field(default=None, ge=0)
    estimated_value: Decimal | None = None
    deadline: datetime | None = None


class QuoteTranslationItemUpdate(BaseModel):
    source_language: str | None = None
    target_language: str | None = None
    document_type: str | None = None
    file_url: str | None = None
    word_count: int | None = Field(default=None, ge=0)
    estimated_value: Decimal | None = None
    deadline: datetime | None = None


class QuoteTranslationItemResponse(BaseModel):
    id: uuid.UUID
    quote_id: uuid.UUID
    source_language: str
    target_language: str
    document_type: str | None = None
    file_url: str | None = None
    word_count: int | None = None
    estimated_value: Decimal | None = None
    deadline: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
