import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.modules.translators.models.translator_language import ProficiencyLevel
from app.shared.database import Base

if TYPE_CHECKING:
    from app.modules.system_parameters.models.language import Language
    from app.modules.translators.models.translator import Translator


class CertificateStatus(enum.StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


# CERTIFICADO QUE COMPROVA UM IDIOMA DE TRABALHO DO TRADUTOR
# O ARQUIVO FICA NO SUPABASE STORAGE; AQUI FICAM APENAS CAMINHO, METADADOS E STATUS
class TranslatorCertificate(Base):
    __tablename__ = "translator_certificates"

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

    # REFERENCIA E METADADOS DO ARQUIVO NO STORAGE
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    checksum_sha256: Mapped[str] = mapped_column(String(64), nullable=False)

    status: Mapped[CertificateStatus] = mapped_column(
        SQLEnum(
            CertificateStatus,
            name="certificate_status_enum",
            native_enum=False,
            values_callable=lambda statuses: [status.value for status in statuses],
        ),
        nullable=False,
        default=CertificateStatus.PENDING,
        server_default=CertificateStatus.PENDING.value,
    )

    # DADOS DA AVALIACAO FEITA PELO ADMINISTRADOR
    review_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    translator: Mapped["Translator"] = relationship("Translator")
    language: Mapped["Language"] = relationship("Language")

    @property
    def language_name(self) -> str:
        return self.language.name

    # UM CERTIFICADO POR IDIOMA; UM NOVO ENVIO SUBSTITUI O ARQUIVO ANTERIOR
    __table_args__ = (
        UniqueConstraint("translator_id", "language_id", name="uq_translator_certificate_language"),
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected')",
            name="ck_translator_certificates_status",
        ),
    )
