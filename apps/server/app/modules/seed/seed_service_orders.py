import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session, selectinload

from app.modules.clients.models.company import Company
from app.modules.quotes.models.quote import Quote
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_item import ServiceOrderItem
from app.shared.database import get_session_factory

SEED_SERVICE_ORDER_ID = uuid.UUID("b2b3b4b5-0000-4000-8000-000000000001")
SEED_QUOTE_ID = uuid.UUID("3fa85f64-5717-4562-b3fc-2c963f66afa6")
SEED_COMPANY_TRADE_NAME = "Traduzir Idiomas"


def seed_service_orders(*, db: Session | None = None) -> list[str]:
    database_session = db or get_session_factory()()
    should_close_session = db is None

    try:
        quote = (
            database_session.query(Quote)
            .options(selectinload(Quote.items))
            .filter(Quote.id == SEED_QUOTE_ID)
            .first()
        )
        company = (
            database_session.query(Company)
            .filter(Company.trade_name == SEED_COMPANY_TRADE_NAME)
            .first()
        )

        if not quote or not company:
            database_session.commit()
            return []

        service_order = database_session.get(ServiceOrder, SEED_SERVICE_ORDER_ID)
        if service_order is None:
            service_order = ServiceOrder(id=SEED_SERVICE_ORDER_ID)
            database_session.add(service_order)

        service_order.quote_id = quote.id
        service_order.company_id = company.id
        service_order.project_name = "Tradução de contrato societário"
        service_order.deadline = datetime.now(UTC) + timedelta(days=15)

        for translation_item in quote.items:
            service_order_item = (
                database_session.query(ServiceOrderItem)
                .filter(
                    ServiceOrderItem.service_order_id == service_order.id,
                    ServiceOrderItem.quote_translation_item_id == translation_item.id,
                )
                .first()
            )
            if service_order_item is None:
                service_order_item = ServiceOrderItem(
                    service_order_id=service_order.id,
                    quote_translation_item_id=translation_item.id,
                )
                database_session.add(service_order_item)

            service_order_item.source_language = translation_item.source_language
            service_order_item.target_language = translation_item.target_language
            service_order_item.document_type = translation_item.document_type
            service_order_item.file_url = translation_item.file_url
            service_order_item.price = translation_item.estimated_value

        database_session.add(service_order)
        database_session.commit()

        return [str(service_order.id)]
    finally:
        if should_close_session:
            database_session.close()
