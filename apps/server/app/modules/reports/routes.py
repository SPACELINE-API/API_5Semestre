import uuid
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.modules.auth.dependencies.dependencies import require_permission
from app.modules.reports.permissions import PRODUCTIVITY_READ_PERMISSION
from app.modules.reports.schemas.productivity import (
    ProductivityFiltersResponse,
    ProductivityReportResponse,
    TranslatorProductivityDetails,
)
from app.modules.reports.services.productivity_service import ProductivityService
from app.shared.database import get_db

router = APIRouter(
    prefix="/reports/productivity",
    tags=["reports"],
    dependencies=[Depends(require_permission(PRODUCTIVITY_READ_PERMISSION))],
)


@router.get("/filters", response_model=ProductivityFiltersResponse)
def get_productivity_filters(db: Session = Depends(get_db)):
    return ProductivityService(db).get_filters()


@router.get("", response_model=ProductivityReportResponse)
def get_productivity_report(
    date_from: date | None = None,
    date_to: date | None = None,
    translator_id: uuid.UUID | None = None,
    service_order_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
):
    return ProductivityService(db).get_report(date_from, date_to, translator_id, service_order_id)


@router.get("/translators/{translator_id}", response_model=TranslatorProductivityDetails)
def get_translator_productivity(
    translator_id: uuid.UUID,
    date_from: date | None = None,
    date_to: date | None = None,
    service_order_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
):
    return ProductivityService(db).get_translator_details(
        translator_id, date_from, date_to, service_order_id
    )
