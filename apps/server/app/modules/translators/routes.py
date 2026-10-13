import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.modules.auth.dependencies.dependencies import require_permission
from app.modules.translators.schemas.translator import (
    QualificationResponse,
    TranslatorCreate,
    TranslatorResponse,
    TranslatorStatusUpdate,
    TranslatorUpdate,
)
from app.modules.translators.services.translator_service import TranslatorService
from app.shared.database import get_db

router = APIRouter(prefix="/translators", tags=["translators"])
translators_read_permission = require_permission("translators.read")
translators_write_permission = require_permission("translators.write")

DbSession = Annotated[Session, Depends(get_db)]


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
