import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.translators.models.translator_certificate import CertificateStatus
from app.modules.translators.models.translator_language import ProficiencyLevel


# RESPOSTA DO CERTIFICADO: APENAS REFERENCIA, METADADOS E STATUS (SEM O CAMINHO INTERNO)
class CertificateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    translator_id: uuid.UUID
    language_id: str
    language_name: str
    proficiency_level: ProficiencyLevel
    filename: str
    content_type: str
    size_bytes: int
    status: CertificateStatus
    review_note: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


# LINK TEMPORARIO PARA VISUALIZAR O ARQUIVO NO BUCKET PRIVADO
class CertificateFileResponse(BaseModel):
    url: str
    expires_in: int


# DECISAO DO ADMINISTRADOR SOBRE UM CERTIFICADO EM ANALISE
class CertificateReviewInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal[CertificateStatus.APPROVED, CertificateStatus.REJECTED]
    review_note: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def require_note_when_rejected(self) -> "CertificateReviewInput":
        self.review_note = (self.review_note or "").strip() or None
        if self.status == CertificateStatus.REJECTED and self.review_note is None:
            raise ValueError("Informe o motivo da recusa do certificado.")
        return self
