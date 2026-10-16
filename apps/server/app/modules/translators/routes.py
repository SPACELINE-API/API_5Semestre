import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.modules.auth.dependencies.dependencies import require_permission
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.translators.models.translator_language import ProficiencyLevel
from app.modules.translators.schemas.certificate import (
    CertificateFileResponse,
    CertificateResponse,
    CertificateReviewInput,
)
from app.modules.translators.schemas.translator import (
    QualificationResponse,
    TranslatorCreate,
    TranslatorProfileResponse,
    TranslatorProfileUpdate,
    TranslatorResponse,
    TranslatorStatusUpdate,
    TranslatorUpdate,
)
from app.modules.translators.services.certificate_service import TranslatorCertificateService
from app.modules.translators.services.file_validation import CERTIFICATE_RULES, PHOTO_RULES
from app.modules.translators.services.profile_service import TranslatorProfileService
from app.modules.translators.services.translator_service import TranslatorService
from app.shared.database import get_db

router = APIRouter(prefix="/translators", tags=["translators"])
translators_read_permission = require_permission("translators.read")
translators_write_permission = require_permission("translators.write")
profile_permission = require_permission("assignments.read")

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[SupabaseAuthenticatedUser, Depends(profile_permission)]


def _read_limited(upload: UploadFile, max_bytes: int) -> bytes:
    return upload.file.read(max_bytes + 1)


@router.get("/me", response_model=TranslatorProfileResponse)
def get_my_profile(db: DbSession, current_user: CurrentUser):
    return TranslatorProfileService(db).get_profile(current_user.email)


@router.patch("/me", response_model=TranslatorProfileResponse)
def update_my_profile(data: TranslatorProfileUpdate, db: DbSession, current_user: CurrentUser):
    return TranslatorProfileService(db).update_profile(current_user.email, data)


@router.post("/me/photo", response_model=TranslatorProfileResponse)
def upload_my_photo(
    db: DbSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
):
    return TranslatorProfileService(db).set_photo(
        current_user.email,
        file.filename or "foto",
        _read_limited(file, PHOTO_RULES.max_bytes),
        file.content_type,
    )


@router.post("/me/certificates", response_model=CertificateResponse, status_code=201)
def submit_my_certificate(
    db: DbSession,
    current_user: CurrentUser,
    language_id: str = Form(..., min_length=1, max_length=20),
    proficiency_level: ProficiencyLevel = Form(...),
    file: UploadFile = File(...),
):
    return TranslatorCertificateService(db).submit(
        current_user.email,
        language_id,
        proficiency_level,
        file.filename or "certificado",
        _read_limited(file, CERTIFICATE_RULES.max_bytes),
        file.content_type,
    )


@router.get("/me/certificates", response_model=list[CertificateResponse])
def list_my_certificates(db: DbSession, current_user: CurrentUser):
    return TranslatorCertificateService(db).list_mine(current_user.email)


@router.get("/me/certificates/{certificate_id}/file", response_model=CertificateFileResponse)
def get_my_certificate_file(
    certificate_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
):
    return TranslatorCertificateService(db).get_my_file(current_user.email, certificate_id)


@router.get("/metadata/qualifications", response_model=list[QualificationResponse])
def list_qualifications(db: DbSession, _user=Depends(translators_read_permission)):
    return TranslatorService(db).list_qualifications()


@router.post("", response_model=TranslatorResponse, status_code=201)
def create_translator(
    data: TranslatorCreate,
    db: DbSession,
    _user=Depends(translators_write_permission),
):
    return TranslatorService(db).create(data)


@router.get("", response_model=list[TranslatorResponse])
def list_translators(
    db: DbSession,
    _user=Depends(translators_read_permission),
):
    return TranslatorService(db).list_all()


@router.patch("/{translator_id}/status", response_model=TranslatorResponse)
def update_translator_status(
    translator_id: uuid.UUID,
    data: TranslatorStatusUpdate,
    db: DbSession,
    _user=Depends(translators_write_permission),
):
    return TranslatorService(db).update_status(translator_id, data)


@router.get("/{translator_id}", response_model=TranslatorResponse)
def get_translator(
    translator_id: uuid.UUID,
    db: DbSession,
    _user=Depends(translators_read_permission),
):
    return TranslatorService(db).get(translator_id)


@router.get("/{translator_id}/certificates", response_model=list[CertificateResponse])
def list_translator_certificates(
    translator_id: uuid.UUID,
    db: DbSession,
    _user=Depends(translators_read_permission),
):
    return TranslatorCertificateService(db).list_for_translator(translator_id)


@router.get(
    "/{translator_id}/certificates/{certificate_id}/file",
    response_model=CertificateFileResponse,
)
def get_translator_certificate_file(
    translator_id: uuid.UUID,
    certificate_id: uuid.UUID,
    db: DbSession,
    _user=Depends(translators_read_permission),
):
    return TranslatorCertificateService(db).get_file(translator_id, certificate_id)


@router.patch(
    "/{translator_id}/certificates/{certificate_id}/review",
    response_model=CertificateResponse,
)
def review_translator_certificate(
    translator_id: uuid.UUID,
    certificate_id: uuid.UUID,
    data: CertificateReviewInput,
    db: DbSession,
    current_user: SupabaseAuthenticatedUser = Depends(translators_write_permission),
):
    return TranslatorCertificateService(db).review(
        translator_id, certificate_id, data, current_user.email
    )


@router.put("/{translator_id}", response_model=TranslatorResponse)
def update_translator(
    translator_id: uuid.UUID,
    data: TranslatorUpdate,
    db: DbSession,
    _user=Depends(translators_write_permission),
):
    return TranslatorService(db).update(translator_id, data)


@router.delete("/{translator_id}", status_code=204)
def delete_translator(
    translator_id: uuid.UUID,
    db: DbSession,
    _user=Depends(translators_write_permission),
):
    TranslatorService(db).delete(translator_id)
