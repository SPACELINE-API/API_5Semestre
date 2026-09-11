from datetime import datetime
import uuid
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database import Base

if TYPE_CHECKING:
    from app.modules.translators.models.translator import Translator


# TABELA ASSOCIATIVA QUE LIGA TRADUTOR AS SUAS QUALIFICACOES TECNICAS (N PARA N)
class TranslatorQualification(Base):
    __tablename__ = "translator_qualifications"

    # CHAVE ESTRANGEIRA DO TRADUTOR COM REMOCAO EM CASCATA (se o tradutor for removido, apaga tudo quanto e coisa que for relacionado a ele em quesito de idioma e qualificacao)
    translator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("translators.id", ondelete="CASCADE"),
        primary_key=True,
    )
    # CHAVE ESTRANGEIRA DA QUALIFICACAO COM REMOCAO EM CASCATA
    qualification_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("technical_qualifications.id", ondelete="CASCADE"),
        primary_key=True,
    )
    # DATA E HORA QUE A QUALIFICACAO FOI ATRIBUIDA AO TRADUTOR
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


# CATALOGO DE QUALIFICACOES TECNICAS DISPONIVEIS NO SISTEMA
class TechnicalQualification(Base):
    __tablename__ = "technical_qualifications"

    # IDENTIFICADOR UNICO DA QUALIFICACAO
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    # NOME DA QUALIFICACAO TECNICA
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    # DESCRICAO DETALHADA DA QUALIFICACAO TECNICA
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # RELACIONAMENTO N PARA N COM TRADUTORES VIA TABELA ASSOCIATIVA
    translators: Mapped[list["Translator"]] = relationship(
        "Translator",
        secondary="translator_qualifications",
        back_populates="qualifications",
    )
