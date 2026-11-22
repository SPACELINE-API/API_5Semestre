from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.auth.dependencies.dependencies import (
    require_permission,
)
from app.modules.system_parameters.models.language import Language
from app.modules.system_parameters.schemas.inactivity_timeout import (
    InactivityTimeoutResponse,
    InactivityTimeoutUpdate,
)
from app.modules.system_parameters.schemas.language import LanguageCreate, LanguageResponse
from app.modules.system_parameters.services.inactivity_timeout import InactivityTimeoutService
from app.modules.translators.models.translator_certificate import TranslatorCertificate
from app.modules.translators.models.translator_language import TranslatorLanguage
from app.shared.database import get_db

router = APIRouter(prefix="/support", tags=["support"])
settings_read_permission = require_permission("settings.read")
settings_write_permission = require_permission("settings.write")
languages_write_permission = require_permission("languages.write")
languages_read_permission = require_permission("languages.read")


@router.get("/languages", response_model=list[LanguageResponse])
def get_languages(db: Session = Depends(get_db)):
    languages = db.query(Language).order_by(Language.name).all()
    return languages


@router.get("/languages/manage", response_model=list[LanguageResponse])
def get_languages_for_management(
    db: Session = Depends(get_db),
    _user=Depends(languages_read_permission),
):
    return db.query(Language).order_by(Language.name).all()


@router.post("/languages", response_model=LanguageResponse, status_code=status.HTTP_201_CREATED)
def create_language(
    payload: LanguageCreate,
    db: Session = Depends(get_db),
    _user=Depends(languages_write_permission),
):
    existing = db.query(Language).filter(Language.id == payload.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Language already exists")

    new_language = Language(id=payload.id, name=payload.name)
    db.add(new_language)
    db.commit()
    db.refresh(new_language)
    return new_language


@router.delete("/languages/{language_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_language(
    language_id: str,
    db: Session = Depends(get_db),
    _user=Depends(languages_write_permission),
):
    language = db.query(Language).filter(Language.id == language_id).first()
    if language is None:
        raise HTTPException(status_code=404, detail="Idioma não encontrado")

    translators_use_language = (
        db.query(TranslatorLanguage.id)
        .filter(TranslatorLanguage.language_id == language_id)
        .first()
    )
    certificates_use_language = (
        db.query(TranslatorCertificate.id)
        .filter(TranslatorCertificate.language_id == language_id)
        .first()
    )
    if translators_use_language or certificates_use_language:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível remover um idioma associado a tradutores ou certificados.",
        )

    db.delete(language)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível remover um idioma que está em uso.",
        ) from error


@router.get("/inactivity-timeout", response_model=InactivityTimeoutResponse)
def get_inactivity_timeout(
    db: Session = Depends(get_db),
    _user=Depends(settings_read_permission),
):
    return InactivityTimeoutService(db).get_inactivity_timeout()


@router.patch("/inactivity-timeout", response_model=InactivityTimeoutResponse)
def change_inactivity_timeout(
    payload: InactivityTimeoutUpdate,
    db: Session = Depends(get_db),
    _user=Depends(settings_write_permission),
):
    return InactivityTimeoutService(db).update_inactivity_timeout(payload)
