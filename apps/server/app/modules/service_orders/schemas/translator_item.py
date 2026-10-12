import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class TranslatorItemFileResponse(BaseModel):
    id: uuid.UUID
    filename: str
    file_url: str
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TranslatorItemResponse(BaseModel):
    id: uuid.UUID
    source_language: str
    target_language: str
    document_type: str | None
    file_url: str | None
    word_count: int | None
    price: Decimal | None
    deadline: datetime | None
    status: str
    delivered_files: list[TranslatorItemFileResponse]
