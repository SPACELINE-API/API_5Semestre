import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.modules.system_parameters.models.language import Language
from app.modules.translators.models.translator_certificate import (
    CertificateStatus,
    TranslatorCertificate,
)
from app.modules.translators.models.translator_language import TranslatorLanguage


class TranslatorCertificateRepository:
    def __init__(self, db: Session):
        self.db = db

    # BUSCA UM CERTIFICADO GARANTINDO QUE ELE PERTENCE AO TRADUTOR INFORMADO
    def get_for_translator(
        self, translator_id: uuid.UUID, certificate_id: uuid.UUID
    ) -> TranslatorCertificate | None:
        return (
            self.db.query(TranslatorCertificate)
            .options(joinedload(TranslatorCertificate.language))
            .filter(
                TranslatorCertificate.id == certificate_id,
                TranslatorCertificate.translator_id == translator_id,
            )
            .first()
        )

    # BUSCA O CERTIFICADO DO TRADUTOR PARA UM IDIOMA (NO MAXIMO UM POR IDIOMA)
    def get_by_language(
        self, translator_id: uuid.UUID, language_id: str
    ) -> TranslatorCertificate | None:
        return (
            self.db.query(TranslatorCertificate)
            .filter(
                TranslatorCertificate.translator_id == translator_id,
                TranslatorCertificate.language_id == language_id,
            )
            .first()
        )

    # BUSCA UM CERTIFICADO DO TRADUTOR COM O MESMO CONTEUDO (IMPRESSAO DIGITAL SHA-256)
    def get_by_checksum(
        self, translator_id: uuid.UUID, checksum_sha256: str
    ) -> TranslatorCertificate | None:
        return (
            self.db.query(TranslatorCertificate)
            .options(joinedload(TranslatorCertificate.language))
            .filter(
                TranslatorCertificate.translator_id == translator_id,
                TranslatorCertificate.checksum_sha256 == checksum_sha256,
            )
            .first()
        )

    # LISTA OS CERTIFICADOS DO TRADUTOR, DO MAIS RECENTE PARA O MAIS ANTIGO
    def list_by_translator(self, translator_id: uuid.UUID) -> list[TranslatorCertificate]:
        return (
            self.db.query(TranslatorCertificate)
            .options(joinedload(TranslatorCertificate.language))
            .filter(TranslatorCertificate.translator_id == translator_id)
            .order_by(TranslatorCertificate.updated_at.desc())
            .all()
        )

    # CAMINHOS NO STORAGE DE TODOS OS CERTIFICADOS DO TRADUTOR
    def list_storage_paths(self, translator_id: uuid.UUID) -> list[str]:
        return list(
            self.db.scalars(
                select(TranslatorCertificate.storage_path).where(
                    TranslatorCertificate.translator_id == translator_id
                )
            )
        )

    # IDIOMAS DO CADASTRO QUE O TRADUTOR AINDA PODE CERTIFICAR:
    # FORA DO PERFIL E SEM CERTIFICADO APROVADO (PENDENTE OU RECUSADO PODE SER SUBSTITUIDO)
    def list_certifiable_languages(self, translator_id: uuid.UUID) -> list[Language]:
        profile_languages = select(TranslatorLanguage.language_id).where(
            TranslatorLanguage.translator_id == translator_id
        )
        approved_languages = select(TranslatorCertificate.language_id).where(
            TranslatorCertificate.translator_id == translator_id,
            TranslatorCertificate.status == CertificateStatus.APPROVED,
        )
        return list(
            self.db.scalars(
                select(Language)
                .where(
                    Language.id.not_in(profile_languages),
                    Language.id.not_in(approved_languages),
                )
                .order_by(Language.name)
            )
        )
