import uuid
from collections import defaultdict
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload, selectinload

from app.modules.reports.schemas.productivity import (
    ProductivityDeliveredFile,
    ProductivityDocument,
    ProductivityFiltersResponse,
    ProductivityIndicators,
    ProductivityProjectOption,
    ProductivityReportResponse,
    ProductivityTranslatorOption,
    TranslatorProductivity,
    TranslatorProductivityDetails,
)
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_file import DIRECTION_SAIDA
from app.modules.service_orders.models.service_order_item import (
    STATUS_CONCLUIDA,
    ServiceOrderItem,
)
from app.modules.translators.models.translator import Translator

DEFAULT_PERIOD_DAYS = 30
SECONDS_PER_DAY = 86400


def resolve_period(
    date_from: date | None,
    date_to: date | None,
    today: date | None = None,
) -> tuple[date, date]:
    reference = today or datetime.now(UTC).date()
    period_end = date_to or reference
    period_start = date_from or period_end - timedelta(days=DEFAULT_PERIOD_DAYS)

    if period_start > period_end:
        raise HTTPException(
            status_code=422,
            detail="A data inicial não pode ser posterior à data final.",
        )

    return period_start, period_end


def _period_bounds(period_start: date, period_end: date) -> tuple[datetime, datetime]:
    start = datetime.combine(period_start, time.min, tzinfo=UTC)
    end = datetime.combine(period_end + timedelta(days=1), time.min, tzinfo=UTC)
    return start, end


def _is_on_time(item: ServiceOrderItem) -> bool | None:
    if item.deadline is None or item.completed_at is None:
        return None
    return item.completed_at <= item.deadline


def build_indicators(items: list[ServiceOrderItem]) -> ProductivityIndicators:
    on_time = sum(1 for item in items if _is_on_time(item) is True)
    late = sum(1 for item in items if _is_on_time(item) is False)
    evaluated = on_time + late

    turnarounds = [
        (item.completed_at - item.created_at).total_seconds() / SECONDS_PER_DAY
        for item in items
        if item.completed_at is not None and item.created_at is not None
    ]

    return ProductivityIndicators(
        documents_translated=len(items),
        total_words=sum(item.word_count or 0 for item in items),
        total_value=sum((item.price or Decimal("0") for item in items), Decimal("0")),
        projects_count=len({item.service_order_id for item in items}),
        on_time_documents=on_time,
        late_documents=late,
        on_time_rate=round(on_time / evaluated, 4) if evaluated else None,
        average_turnaround_days=(
            round(sum(turnarounds) / len(turnarounds), 2) if turnarounds else None
        ),
    )


class ProductivityService:
    def __init__(self, db: Session):
        self.db = db

    def _get_translator(self, translator_id: uuid.UUID) -> Translator:
        translator = self.db.get(Translator, translator_id)
        if translator is None:
            raise HTTPException(status_code=404, detail="Tradutor não encontrado")
        return translator

    def _ensure_service_order(self, service_order_id: uuid.UUID | None) -> None:
        if service_order_id is not None and self.db.get(ServiceOrder, service_order_id) is None:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")

    def _completed_items(
        self,
        period_start: date,
        period_end: date,
        translator_id: uuid.UUID | None,
        service_order_id: uuid.UUID | None,
    ) -> list[ServiceOrderItem]:
        start, end = _period_bounds(period_start, period_end)
        query = (
            self.db.query(ServiceOrderItem)
            .options(
                joinedload(ServiceOrderItem.service_order).selectinload(ServiceOrder.files),
                joinedload(ServiceOrderItem.translator),
            )
            .filter(
                ServiceOrderItem.status == STATUS_CONCLUIDA,
                ServiceOrderItem.translator_id.is_not(None),
                ServiceOrderItem.completed_at >= start,
                ServiceOrderItem.completed_at < end,
            )
        )
        if translator_id is not None:
            query = query.filter(ServiceOrderItem.translator_id == translator_id)
        if service_order_id is not None:
            query = query.filter(ServiceOrderItem.service_order_id == service_order_id)

        return query.order_by(ServiceOrderItem.completed_at.desc()).all()

    def get_report(
        self,
        date_from: date | None = None,
        date_to: date | None = None,
        translator_id: uuid.UUID | None = None,
        service_order_id: uuid.UUID | None = None,
    ) -> ProductivityReportResponse:
        period_start, period_end = resolve_period(date_from, date_to)
        if translator_id is not None:
            self._get_translator(translator_id)
        self._ensure_service_order(service_order_id)

        items = self._completed_items(period_start, period_end, translator_id, service_order_id)

        grouped: dict[uuid.UUID, list[ServiceOrderItem]] = defaultdict(list)
        for item in items:
            grouped[item.translator.id].append(item)

        translators = [
            TranslatorProductivity(
                translator_id=group_id,
                translator_name=group_items[0].translator.name,
                **build_indicators(group_items).model_dump(),
            )
            for group_id, group_items in grouped.items()
        ]
        translators.sort(key=lambda row: (-row.documents_translated, row.translator_name))

        return ProductivityReportResponse(
            period_start=period_start,
            period_end=period_end,
            translator_id=translator_id,
            service_order_id=service_order_id,
            summary=build_indicators(items),
            translators=translators,
        )

    def get_translator_details(
        self,
        translator_id: uuid.UUID,
        date_from: date | None = None,
        date_to: date | None = None,
        service_order_id: uuid.UUID | None = None,
    ) -> TranslatorProductivityDetails:
        period_start, period_end = resolve_period(date_from, date_to)
        translator = self._get_translator(translator_id)
        self._ensure_service_order(service_order_id)

        items = self._completed_items(period_start, period_end, translator_id, service_order_id)

        return TranslatorProductivityDetails(
            translator_id=translator.id,
            translator_name=translator.name,
            period_start=period_start,
            period_end=period_end,
            service_order_id=service_order_id,
            documents=[self._to_document(item) for item in items],
            **build_indicators(items).model_dump(),
        )

    def get_filters(self) -> ProductivityFiltersResponse:
        translators = self.db.query(Translator).order_by(Translator.name).all()
        service_orders = (
            self.db.query(ServiceOrder)
            .options(selectinload(ServiceOrder.items))
            .order_by(ServiceOrder.project_name)
            .all()
        )

        return ProductivityFiltersResponse(
            translators=[
                ProductivityTranslatorOption(id=translator.id, name=translator.name)
                for translator in translators
            ],
            projects=[
                ProductivityProjectOption(id=order.id, project_name=order.project_name)
                for order in service_orders
            ],
        )

    @staticmethod
    def _to_document(item: ServiceOrderItem) -> ProductivityDocument:
        delivered = sorted(
            (
                file
                for file in item.service_order.files
                if file.service_order_item_id == item.id and file.direction == DIRECTION_SAIDA
            ),
            key=lambda file: file.uploaded_at,
            reverse=True,
        )

        return ProductivityDocument(
            item_id=item.id,
            service_order_id=item.service_order_id,
            project_name=item.service_order.project_name,
            source_language=item.source_language,
            target_language=item.target_language,
            document_type=item.document_type,
            word_count=item.word_count,
            price=item.price,
            deadline=item.deadline,
            completed_at=item.completed_at,
            on_time=_is_on_time(item),
            original_file_url=item.file_url,
            delivered_files=[
                ProductivityDeliveredFile(
                    id=file.id,
                    filename=file.filename,
                    file_url=file.file_url,
                    uploaded_at=file.uploaded_at,
                )
                for file in delivered
            ],
        )
