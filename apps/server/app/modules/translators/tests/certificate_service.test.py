import logging
import uuid

import pytest
from fastapi import HTTPException

from app.modules.auth.models.user import User
from app.modules.system_parameters.models.language import Language
from app.modules.translators.models.translator import Translator
from app.modules.translators.models.translator_certificate import (
    CertificateStatus,
    TranslatorCertificate,
)
from app.modules.translators.models.translator_language import (
    ProficiencyLevel,
    TranslatorLanguage,
)
from app.modules.translators.schemas.certificate import CertificateReviewInput
from app.modules.translators.services import storage
from app.modules.translators.services.certificate_service import TranslatorCertificateService

PDF = b"%PDF-1.7\n" + b"0" * 64 + b"\n%%EOF\n"
GIF = b"GIF89a" + b"0" * 32


class FakeStorage:
    def __init__(self):
        self.uploaded: list[tuple[str, str]] = []
        self.deleted: list[tuple[str, str]] = []
        self.fail_upload = False

    def upload_object(self, bucket, object_path, content, content_type):
        if self.fail_upload:
            raise HTTPException(status_code=502, detail="Não foi possível armazenar o arquivo.")
        self.uploaded.append((bucket, object_path))

    def delete_object(self, bucket, object_path):
        self.deleted.append((bucket, object_path))

    def create_signed_url(self, bucket, object_path, expires_in=storage.SIGNED_URL_EXPIRES_IN):
        return f"https://storage.test/{bucket}/{object_path}?token=abc"


@pytest.fixture
def fake_storage(monkeypatch):
    fake = FakeStorage()
    monkeypatch.setattr(storage, "upload_object", fake.upload_object)
    monkeypatch.setattr(storage, "delete_object", fake.delete_object)
    monkeypatch.setattr(storage, "create_signed_url", fake.create_signed_url)
    return fake


@pytest.fixture
def db_session(isolated_db_session):
    isolated_db_session.add_all(
        [
            Language(id="pt-BR", name="Português"),
            Language(id="es", name="Espanhol"),
            Language(id="fr", name="Francês"),
        ]
    )
    isolated_db_session.flush()
    return isolated_db_session


def make_translator(db_session) -> Translator:
    translator = Translator(
        name="Tradutora Certificada",
        email=f"{uuid.uuid4().hex[:10]}@translators.com",
        phone="(11) 98765-4321",
    )
    translator.languages = [
        TranslatorLanguage(language_id="pt-BR", proficiency_level=ProficiencyLevel.NATIVE)
    ]
    db_session.add(translator)
    db_session.commit()
    return translator


@pytest.fixture
def translator(db_session):
    return make_translator(db_session)


def submit(service, translator, *, language_id="es", content=PDF, declared="application/pdf"):
    return service.submit(
        translator.email,
        language_id,
        ProficiencyLevel.ADVANCED,
        "certificado-dele.pdf",
        content,
        declared,
    )


def count_certificates(db_session) -> int:
    return db_session.query(TranslatorCertificate).count()


def test_valid_certificate_is_stored_and_only_metadata_is_saved(
    db_session, translator, fake_storage
):
    certificate = submit(TranslatorCertificateService(db_session), translator)

    assert certificate.status == CertificateStatus.PENDING
    assert certificate.language_id == "es"
    assert certificate.language_name == "Espanhol"
    assert certificate.filename == "certificado-dele.pdf"
    assert certificate.content_type == "application/pdf"
    assert certificate.size_bytes == len(PDF)

    bucket, object_path = fake_storage.uploaded[0]
    assert bucket == storage.CERTIFICATE_BUCKET
    assert object_path.startswith(f"{translator.id}/")

    stored = db_session.get(TranslatorCertificate, certificate.id)
    assert stored.storage_path == object_path
    assert len(stored.checksum_sha256) == 64


def test_invalid_file_is_rejected_before_reaching_storage(db_session, translator, fake_storage):
    with pytest.raises(HTTPException) as error:
        submit(
            TranslatorCertificateService(db_session),
            translator,
            content=GIF,
            declared="image/gif",
        )

    assert error.value.status_code == 422
    assert "PDF, JPG ou PNG" in error.value.detail
    assert fake_storage.uploaded == []
    assert count_certificates(db_session) == 0


def test_storage_failure_is_logged_without_creating_association(
    db_session, translator, fake_storage, caplog
):
    fake_storage.fail_upload = True

    with caplog.at_level(logging.ERROR), pytest.raises(HTTPException) as error:
        submit(TranslatorCertificateService(db_session), translator)

    assert error.value.status_code == 502
    assert count_certificates(db_session) == 0
    assert any("certificado" in record.message for record in caplog.records)


def test_database_failure_removes_uploaded_file(
    db_session, translator, fake_storage, monkeypatch, caplog
):
    def failing_commit():
        raise RuntimeError("database unavailable")

    service = TranslatorCertificateService(db_session)
    monkeypatch.setattr(db_session, "commit", failing_commit)

    with caplog.at_level(logging.ERROR), pytest.raises(HTTPException) as error:
        submit(service, translator)
    monkeypatch.undo()

    assert error.value.status_code == 500
    assert fake_storage.deleted == fake_storage.uploaded
    assert count_certificates(db_session) == 0
    assert any("Falha ao registrar" in record.message for record in caplog.records)


def test_resubmission_replaces_file_and_returns_to_pending(db_session, translator, fake_storage):
    service = TranslatorCertificateService(db_session)
    first = submit(service, translator)
    service.review(
        translator.id,
        first.id,
        CertificateReviewInput(status=CertificateStatus.REJECTED, review_note="Ilegível"),
        "admin@example.com",
    )

    second = submit(service, translator)

    assert second.id == first.id
    assert second.status == CertificateStatus.PENDING
    assert second.review_note is None
    assert second.reviewed_at is None
    assert fake_storage.deleted == [fake_storage.uploaded[0]]
    assert count_certificates(db_session) == 1


def test_approved_certificate_cannot_be_replaced(db_session, translator, fake_storage):
    service = TranslatorCertificateService(db_session)
    certificate = submit(service, translator)
    service.review(
        translator.id,
        certificate.id,
        CertificateReviewInput(status=CertificateStatus.APPROVED),
        "admin@example.com",
    )

    with pytest.raises(HTTPException) as error:
        submit(service, translator, language_id="es")

    assert error.value.status_code == 409


def test_language_already_in_profile_cannot_be_certified(db_session, translator, fake_storage):
    with pytest.raises(HTTPException) as error:
        submit(TranslatorCertificateService(db_session), translator, language_id="pt-BR")

    assert error.value.status_code == 409
    assert fake_storage.uploaded == []


def test_unknown_language_is_rejected(db_session, translator, fake_storage):
    with pytest.raises(HTTPException) as error:
        submit(TranslatorCertificateService(db_session), translator, language_id="xx")

    assert error.value.status_code == 422


def test_translator_lists_only_own_certificates(db_session, translator, fake_storage):
    service = TranslatorCertificateService(db_session)
    other = make_translator(db_session)
    submit(service, translator, language_id="es")
    submit(service, translator, language_id="fr")
    submit(service, other, language_id="es")

    certificates = service.list_mine(translator.email)

    assert {item.language_id for item in certificates} == {"es", "fr"}
    assert all(item.translator_id == translator.id for item in certificates)


def test_file_access_uses_signed_url_and_is_restricted_to_owner(
    db_session, translator, fake_storage
):
    service = TranslatorCertificateService(db_session)
    other = make_translator(db_session)
    certificate = submit(service, translator)

    file = service.get_my_file(translator.email, certificate.id)

    assert file.url.startswith(f"https://storage.test/{storage.CERTIFICATE_BUCKET}/")
    assert file.expires_in == storage.SIGNED_URL_EXPIRES_IN
    with pytest.raises(HTTPException) as error:
        service.get_my_file(other.email, certificate.id)
    assert error.value.status_code == 404


def test_approval_adds_language_to_translator_profile(db_session, translator, fake_storage):
    reviewer = User(email="admin@example.com", password_hash="hash", role="Administrador")
    db_session.add(reviewer)
    db_session.commit()
    service = TranslatorCertificateService(db_session)
    certificate = submit(service, translator)

    reviewed = service.review(
        translator.id,
        certificate.id,
        CertificateReviewInput(status=CertificateStatus.APPROVED),
        reviewer.email,
    )

    assert reviewed.status == CertificateStatus.APPROVED
    assert reviewed.reviewed_at is not None
    assert db_session.get(TranslatorCertificate, certificate.id).reviewed_by_id == reviewer.id
    db_session.refresh(translator)
    added = {item.language_id: item.proficiency_level for item in translator.languages}
    assert added["es"] == ProficiencyLevel.ADVANCED


def test_rejection_keeps_profile_and_blocks_new_review(db_session, translator, fake_storage):
    service = TranslatorCertificateService(db_session)
    certificate = submit(service, translator)

    reviewed = service.review(
        translator.id,
        certificate.id,
        CertificateReviewInput(status=CertificateStatus.REJECTED, review_note="Documento vencido"),
        "admin@example.com",
    )

    assert reviewed.status == CertificateStatus.REJECTED
    assert reviewed.review_note == "Documento vencido"
    db_session.refresh(translator)
    assert [item.language_id for item in translator.languages] == ["pt-BR"]
    with pytest.raises(HTTPException) as error:
        service.review(
            translator.id,
            certificate.id,
            CertificateReviewInput(status=CertificateStatus.APPROVED),
            "admin@example.com",
        )
    assert error.value.status_code == 409


def test_admin_listing_of_unknown_translator_is_404(db_session, fake_storage):
    with pytest.raises(HTTPException) as error:
        TranslatorCertificateService(db_session).list_for_translator(uuid.uuid4())

    assert error.value.status_code == 404
