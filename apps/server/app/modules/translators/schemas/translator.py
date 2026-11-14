import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.translators.models.translator_language import ProficiencyLevel


class TranslatorLanguageInput(BaseModel):
    language_id: str = Field(..., max_length=20)
    proficiency_level: ProficiencyLevel


# PAYLOAD DE ATUALIZACAO DO TRADUTOR
class TranslatorUpdate(BaseModel):
    name: str = Field(..., max_length=150)
    email: str = Field(..., max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    phone: str = Field(..., max_length=30)
    qualification_ids: list[uuid.UUID] = Field(default_factory=list)
    languages: list[TranslatorLanguageInput] = Field(..., min_length=1)

    # O E-MAIL TAMBEM IDENTIFICA A CONTA DE ACESSO, QUE GUARDA O ENDERECO EM MINUSCULAS
    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("languages")
    @classmethod
    def no_duplicate_languages(
        cls, languages: list[TranslatorLanguageInput]
    ) -> list[TranslatorLanguageInput]:
        ids = [language.language_id for language in languages]
        if len(ids) != len(set(ids)):
            raise ValueError("IDIOMAS DUPLICADOS NO PAYLOAD")
        return languages


# PAYLOAD DE CRIACAO: O PERFIL DA CONTA E SEMPRE TRADUTOR, ENTAO NAO ACEITA CAMPOS EXTRAS
class TranslatorCreate(TranslatorUpdate):
    model_config = ConfigDict(extra="forbid")


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


class TranslatorAccountLinkResponse(BaseModel):
    status: str
    sent_at: datetime
    expires_at: datetime
    used_at: datetime | None = None


# CONTA DE ACESSO DO TRADUTOR; A SENHA NUNCA E EXPOSTA, APENAS SE JA FOI DEFINIDA
class TranslatorAccountResponse(BaseModel):
    user_id: uuid.UUID
    status: str
    password_defined: bool
    latest_link: TranslatorAccountLinkResponse | None = None


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
    account: TranslatorAccountResponse | None = None


class TranslatorProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., min_length=1, max_length=150)
    phone: str = Field(..., min_length=1, max_length=30)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("Informe o nome.")
        return name

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        phone = value.strip()
        if len([char for char in phone if char.isdigit()]) < 10:
            raise ValueError("Telefone inválido (mínimo 10 dígitos).")
        return phone


class TranslatorProfileResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    phone: str
    is_active: bool
    photo_url: str | None = None
    photo_filename: str | None = None
    photo_size_bytes: int | None = None
    qualifications: list[QualificationResponse] = []
    languages: list[TranslatorLanguageResponse] = []
