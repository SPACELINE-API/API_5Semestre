import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


# PAYLOAD DO PAR DE IDIOMA NO CADASTRO OU ATUALIZACAO DO TRADUTOR
class LanguagePairInput(BaseModel):
    language_pair_id: uuid.UUID
    proficiency_level: str


# PAYLOAD DE CRIACAO E ATUALIZACAO DO TRADUTOR
class TranslatorCreate(BaseModel):
    name: str = Field(..., max_length=150)
    email: str = Field(..., max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    phone: str = Field(..., max_length=30)
    qualification_ids: list[uuid.UUID] = Field(default_factory=list)
    language_pairs: list[LanguagePairInput] = Field(..., min_length=1)

    @field_validator("language_pairs")
    @classmethod
    def no_duplicate_pairs(cls, pairs: list[LanguagePairInput]) -> list[LanguagePairInput]:
        # VALIDA DUPLICIDADE DE PARES NO PAYLOAD
        ids = [p.language_pair_id for p in pairs]
        if len(ids) != len(set(ids)):
            raise ValueError("PARES DE IDIOMA DUPLICADOS NO PAYLOAD")
        return pairs


# ALIAS PARA ATUALIZACAO (MESMAS REGRAS)
TranslatorUpdate = TranslatorCreate


# RESPOSTA DE UM PAR DE IDIOMA ASSOCIADO AO TRADUTOR
class LanguagePairResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    language_pair_id: uuid.UUID
    proficiency_level: str
    # CAMPOS DE IDIOMA EXPOSTOS PARA O FRONTEND SEM NECESSIDADE DE REQUISICAO ADICIONAL
    source_language: str = Field(alias="language_pair.source_language", default="")
    target_language: str = Field(alias="language_pair.target_language", default="")

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):  # type: ignore[override]
        # RESOLVE OS CAMPOS ANINHADOS DO RELACIONAMENTO SQLALCHEMY
        if hasattr(obj, "language_pair") and obj.language_pair is not None:
            return super().model_validate(
                {
                    "id": obj.id,
                    "language_pair_id": obj.language_pair_id,
                    "proficiency_level": obj.proficiency_level,
                    "source_language": obj.language_pair.source_language,
                    "target_language": obj.language_pair.target_language,
                }
            )
        return super().model_validate(obj, *args, **kwargs)


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
    language_pairs: list[LanguagePairResponse] = []
