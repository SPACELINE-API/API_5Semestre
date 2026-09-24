import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.modules.translators.schemas.translator import (
    TranslatorCreate,
    TranslatorPage,
    TranslatorResponse,
    TranslatorUpdate,
)
from app.modules.translators.services.translator_service import TranslatorService
from app.shared.database import get_db

router = APIRouter(prefix="/translators", tags=["translators"])

DbSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=TranslatorResponse, status_code=201)
def create_translator(
    data: TranslatorCreate,
    db: DbSession,
):
    return TranslatorService(db).create(data)


@router.get("", response_model=TranslatorPage)
def list_translators(
    db: DbSession,
    language: str | None = None,
    specialty: str | None = None,
    status: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    service = TranslatorService(db)
    items, total = service.search(
        language=language, specialty=specialty, status=status, page=page, page_size=page_size
    )
    return TranslatorPage(
        items=[TranslatorResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


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
