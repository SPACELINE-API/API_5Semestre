import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.modules.translators.schemas.translator import (
    DictionaryLanguagePairResponse,
    QualificationResponse,
    TranslatorCreate,
    TranslatorResponse,
    TranslatorUpdate,
)
from app.modules.translators.services.translator_service import TranslatorService
from app.shared.database import get_db

router = APIRouter(prefix="/translators", tags=["translators"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("/metadata/qualifications", response_model=list[QualificationResponse])
def list_qualifications(db: DbSession):
    return TranslatorService(db).list_qualifications()


@router.get("/metadata/language-pairs", response_model=list[DictionaryLanguagePairResponse])
def list_language_pairs(db: DbSession):
    return TranslatorService(db).list_language_pairs()


@router.post("", response_model=TranslatorResponse, status_code=201)
def create_translator(
    data: TranslatorCreate,
    db: DbSession,
):
    return TranslatorService(db).create(data)


@router.get("", response_model=list[TranslatorResponse])
def list_translators(
    db: DbSession,
):
    return TranslatorService(db).list_all()


@router.get("/{translator_id}", response_model=TranslatorResponse)
def get_translator(
    translator_id: uuid.UUID,
    db: DbSession,
):
    return TranslatorService(db).get(translator_id)


@router.put("/{translator_id}", response_model=TranslatorResponse)
def update_translator(
    translator_id: uuid.UUID,
    data: TranslatorUpdate,
    db: DbSession,
):
    return TranslatorService(db).update(translator_id, data)


@router.delete("/{translator_id}", status_code=204)
def delete_translator(
    translator_id: uuid.UUID,
    db: DbSession,
):
    TranslatorService(db).delete(translator_id)
