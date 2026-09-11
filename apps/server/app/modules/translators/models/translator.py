from datetime import datetime
import uuid
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database import Base

if TYPE_CHECKING:
    from app.modules.translators.models.language_pair import TranslatorLanguagePair
    from app.modules.translators.models.qualification import TechnicalQualification


# ENTIDADE PRINCIPAL DO TRADUTOR NO BANCO DE TALENTOS
class Translator(Base):
    __tablename__ = "translators"

    # IDENTIFICADOR UNICO DO TRADUTOR
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    # NOME COMPLETO
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    # EMAIL UNICO
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    # TELEFONE DE CONTATO
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    # STATUS ATIVO OU INATIVO
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # DATA E HORA DE CRIACAO DO REGISTRO
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    # DATA E HORA DA ULTIMA ATUALIZACAO DO REGISTRO
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # RELACIONAMENTO COM MULTIPLAS QUALIFICACOES TECNICAS
    qualifications: Mapped[list["TechnicalQualification"]] = relationship(
        "TechnicalQualification",
        secondary="translator_qualifications",
        back_populates="translators",
    )
    # RELACIONAMENTO COM MULTIPLOS PARES DE IDIOMA E PROFICIENCIA
    language_pairs: Mapped[list["TranslatorLanguagePair"]] = relationship(
        "TranslatorLanguagePair",
        back_populates="translator",
        cascade="all, delete-orphan",
    )
