import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database import Base

if TYPE_CHECKING:
    from app.modules.translators.models.translator import Translator


# ENUMERACAO DOS NIVEIS DE PROFICIENCIA POSSIVEIS
class ProficiencyLevel(enum.StrEnum):
    BASIC = "basic"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    FLUENT = "fluent"
    NATIVE = "native"


# CATALOGO DE PARES DE IDIOMA INDEPENDENTES DO SISTEMA
class LanguagePair(Base):
    __tablename__ = "language_pairs"

    # IDENTIFICADOR UNICO DO PAR DE IDIOMA
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    # IDIOMA DE ORIGEM EM FORMATO ISO (EX: PT-BR PARA EN, EN PARA FR)
    source_language: Mapped[str] = mapped_column(String(10), nullable=False)
    # IDIOMA DE DESTINO
    target_language: Mapped[str] = mapped_column(String(10), nullable=False)

    # RESTRICAO QUE IMPEDE CADASTRAR O MESMO PAR REPETIDO NO CATALOGO GERAL
    __table_args__ = (
        UniqueConstraint(
            "source_language", "target_language", name="uq_language_pair_source_target"
        ),
    )


# ASSOCIACAO ENTRE TRADUTOR E PAR DE IDIOMA COM NIVEL DE PROFICIENCIA PROPRIO
class TranslatorLanguagePair(Base):
    __tablename__ = "translator_language_pairs"

    # IDENTIFICADOR UNICO DA ASSOCIACAO
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    # CHAVE ESTRANGEIRA DO TRADUTOR COM REMOCAO EM CASCATA
    translator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("translators.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # CHAVE ESTRANGEIRA DO PAR DE IDIOMA VINCULADO
    language_pair_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("language_pairs.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # NIVEL DE PROFICIENCIA DO TRADUTOR NESTE PAR ESPECIFICO
    proficiency_level: Mapped[ProficiencyLevel] = mapped_column(
        SQLEnum(ProficiencyLevel, name="proficiency_level_enum", native_enum=False),
        nullable=False,
    )

    # RELACIONAMENTO DE VOLTA PARA O TRADUTOR
    translator: Mapped["Translator"] = relationship("Translator", back_populates="language_pairs")
    # RELACIONAMENTO COM O PAR DE IDIOMA DO CATALOGO
    language_pair: Mapped["LanguagePair"] = relationship("LanguagePair")

    # REGRA NO BANCO QUE IMPEDE DUPLICIDADE DO MESMO PAR PARA O MESMO TRADUTOR
    __table_args__ = (
        UniqueConstraint("translator_id", "language_pair_id", name="uq_translator_language_pair"),
    )
