import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.database import Base

if TYPE_CHECKING:
    from app.modules.system_parameters.models.language import Language
    from app.modules.translators.models.translator import Translator


class ProficiencyLevel(enum.StrEnum):
    BASIC = "basic"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    FLUENT = "fluent"
    NATIVE = "native"


class TranslatorLanguage(Base):
    __tablename__ = "translator_languages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    translator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("translators.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    language_id: Mapped[str] = mapped_column(
        String(20),
        ForeignKey("languages.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    proficiency_level: Mapped[ProficiencyLevel] = mapped_column(
        SQLEnum(
            ProficiencyLevel,
            name="proficiency_level_enum",
            native_enum=False,
            values_callable=lambda levels: [level.value for level in levels],
        ),
        nullable=False,
    )

    translator: Mapped["Translator"] = relationship("Translator", back_populates="languages")
    language: Mapped["Language"] = relationship("Language")

    @property
    def language_name(self) -> str:
        return self.language.name

    __table_args__ = (
        UniqueConstraint("translator_id", "language_id", name="uq_translator_language"),
    )
