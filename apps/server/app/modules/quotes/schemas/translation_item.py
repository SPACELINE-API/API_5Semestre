import uuid
from datetime import datetime
from pydantic import BaseModel, Field


from typing import Literal

SupportedLanguage = Literal[
    "en-US", "it-IT", "es-ES", "ca-ES", "gl-ES", "eu-ES", 
    "fr-FR", "de-DE", "ja-JP", "zh-CN", "en-CA", "fr-CA", 
    "es-PE", "qu-PE", "ay-PE"
]

class QuoteTranslationItemCreate(BaseModel):
    source_language: SupportedLanguage
    target_language: SupportedLanguage


class QuoteTranslationItemResponse(BaseModel):
    id: uuid.UUID
    quote_id: uuid.UUID
    source_language: str
    target_language: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
