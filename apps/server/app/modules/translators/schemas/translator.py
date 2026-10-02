import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.translators.models.translator_language import ProficiencyLevel


class TranslatorLanguageInput(BaseModel):
    language_id: str = Field(..., max_length=20)
    proficiency_level: ProficiencyLevel


# PAYLOAD DE CRIACAO E ATUALIZACAO DO TRADUTOR
class TranslatorCreate(BaseModel):
    name: str = Field(..., max_length=150)
    email: str = Field(..., max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    phone: str = Field(..., max_length=30)
    qualification_ids: list[uuid.UUID] = Field(default_factory=list)
    languages: list[TranslatorLanguageInput] = Field(..., min_length=1)

    @field_validator("languages")
    @classmethod
    def no_duplicate_languages(
        cls, languages: list[TranslatorLanguageInput]
    ) -> list[TranslatorLanguageInput]:
        ids = [language.language_id for language in languages]
        if len(ids) != len(set(ids)):
            raise ValueError("IDIOMAS DUPLICADOS NO PAYLOAD")
        return languages


# ALIAS PARA ATUALIZACAO (MESMAS REGRAS)
TranslatorUpdate = TranslatorCreate


class TranslatorStatusUpdate(BaseModel):
    is_active: bool


class TranslatorLanguageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    language_id: str
    language_name: str
    proficiency_level: str


# RESPOSTA DE UMA QUALIFICACAO TECNICA
class QualificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None = None


# RESPOSTA COMPLETA DO TRADUTOR COM RELACIONAMENTOS
class TranslatorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    phone: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    qualifications: list[QualificationResponse] = []
    languages: list[TranslatorLanguageResponse] = []
