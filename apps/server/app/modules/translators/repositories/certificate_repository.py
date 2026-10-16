import uuid

from sqlalchemy.orm import Session, joinedload

from app.modules.translators.models.translator_certificate import TranslatorCertificate


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

    # LISTA OS CERTIFICADOS DO TRADUTOR, DO MAIS RECENTE PARA O MAIS ANTIGO
    def list_by_translator(self, translator_id: uuid.UUID) -> list[TranslatorCertificate]:
        return (
            self.db.query(TranslatorCertificate)
            .options(joinedload(TranslatorCertificate.language))
            .filter(TranslatorCertificate.translator_id == translator_id)
            .order_by(TranslatorCertificate.updated_at.desc())
            .all()
        )
