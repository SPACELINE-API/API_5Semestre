import hashlib
import logging
import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.system_parameters.models.language import Language
from app.modules.translators.models.translator import Translator
from app.modules.translators.models.translator_certificate import (
    CertificateStatus,
    TranslatorCertificate,
)
from app.modules.translators.models.translator_language import ProficiencyLevel
from app.modules.translators.repositories.certificate_repository import (
    TranslatorCertificateRepository,
)
from app.modules.translators.schemas.certificate import (
    CertificateFileResponse,
    CertificateResponse,
)
from app.modules.translators.services import storage
from app.modules.translators.services.file_validation import CERTIFICATE_RULES, validate_upload
from app.modules.translators.services.profile_service import TranslatorProfileService

logger = logging.getLogger(__name__)


class TranslatorCertificateService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = TranslatorCertificateRepository(db)
        self.profiles = TranslatorProfileService(db)

    # ENVIA OU SUBSTITUI O CERTIFICADO DE UM IDIOMA DO TRADUTOR AUTENTICADO
    def submit(
        self,
        email: str,
        language_id: str,
        proficiency_level: ProficiencyLevel,
        filename: str,
        content: bytes,
        declared_type: str | None,
    ) -> CertificateResponse:
        translator = self.profiles.get_translator(email)
        self._ensure_language_can_be_certified(translator, language_id)
        content_type = validate_upload(content, declared_type, CERTIFICATE_RULES)

        certificate = self.repo.get_by_language(translator.id, language_id)
        if certificate is not None and certificate.status == CertificateStatus.APPROVED:
            raise HTTPException(
                status_code=409,
                detail="O certificado deste idioma já foi aprovado.",
            )

        # 1) ARMAZENA O ARQUIVO; SE FALHAR, NADA E GRAVADO NO BANCO
        new_path = storage.build_object_path(translator.id, filename)
        self._upload(new_path, content, content_type, translator.id)

        # 2) GRAVA A REFERENCIA; SE FALHAR, REMOVE O ARQUIVO PARA NAO DEIXAR ASSOCIACAO INCOMPLETA
        previous_path = certificate.storage_path if certificate is not None else None
        if certificate is None:
            certificate = TranslatorCertificate(
                translator_id=translator.id,
                language_id=language_id,
            )
            self.db.add(certificate)

        certificate.proficiency_level = proficiency_level
        certificate.storage_path = new_path
        certificate.filename = filename[:255]
        certificate.content_type = content_type
        certificate.size_bytes = len(content)
        certificate.checksum_sha256 = hashlib.sha256(content).hexdigest()
        certificate.status = CertificateStatus.PENDING
        certificate.review_note = None
        certificate.reviewed_by_id = None
        certificate.reviewed_at = None

        try:
            self.db.commit()
        except Exception as error:
            self.db.rollback()
            logger.exception(
                "Falha ao registrar certificado do tradutor %s (idioma %s)",
                translator.id,
                language_id,
            )
            self._discard(new_path)
            raise HTTPException(
                status_code=500,
                detail="Não foi possível registrar o certificado. Tente novamente.",
            ) from error

        # O ARQUIVO SUBSTITUIDO SO E REMOVIDO DEPOIS QUE O NOVO FOI REGISTRADO
        if previous_path:
            self._discard(previous_path)

        self.db.refresh(certificate)
        return CertificateResponse.model_validate(certificate)

    def list_mine(self, email: str) -> list[CertificateResponse]:
        translator = self.profiles.get_translator(email)
        return self._to_responses(self.repo.list_by_translator(translator.id))

    def get_my_file(self, email: str, certificate_id: uuid.UUID) -> CertificateFileResponse:
        translator = self.profiles.get_translator(email)
        return self._signed_file(self._get_certificate_or_404(translator.id, certificate_id))

    def _ensure_language_can_be_certified(self, translator: Translator, language_id: str) -> None:
        if self.db.get(Language, language_id) is None:
            raise HTTPException(status_code=422, detail="Idioma não encontrado.")

        if any(language.language_id == language_id for language in translator.languages):
            raise HTTPException(
                status_code=409,
                detail="Este idioma já está cadastrado no seu perfil.",
            )

    def _get_certificate_or_404(
        self, translator_id: uuid.UUID, certificate_id: uuid.UUID
    ) -> TranslatorCertificate:
        certificate = self.repo.get_for_translator(translator_id, certificate_id)
        if certificate is None:
            raise HTTPException(status_code=404, detail="Certificado não encontrado.")
        return certificate

    def _signed_file(self, certificate: TranslatorCertificate) -> CertificateFileResponse:
        url = storage.create_signed_url(storage.CERTIFICATE_BUCKET, certificate.storage_path)
        return CertificateFileResponse(url=url, expires_in=storage.SIGNED_URL_EXPIRES_IN)

    def _upload(
        self,
        object_path: str,
        content: bytes,
        content_type: str,
        translator_id: uuid.UUID,
    ) -> None:
        try:
            storage.upload_object(storage.CERTIFICATE_BUCKET, object_path, content, content_type)
        except HTTPException:
            logger.error("Storage recusou o certificado do tradutor %s", translator_id)
            raise
        except Exception as error:
            logger.exception("Falha ao enviar certificado do tradutor %s", translator_id)
            raise HTTPException(
                status_code=502,
                detail="Não foi possível armazenar o certificado. Tente novamente.",
            ) from error

    def _discard(self, object_path: str) -> None:
        try:
            storage.delete_object(storage.CERTIFICATE_BUCKET, object_path)
        except Exception:
            logger.exception("Não foi possível remover o arquivo %s do storage", object_path)

    def _to_responses(self, certificates: list[TranslatorCertificate]) -> list[CertificateResponse]:
        return [CertificateResponse.model_validate(item) for item in certificates]
