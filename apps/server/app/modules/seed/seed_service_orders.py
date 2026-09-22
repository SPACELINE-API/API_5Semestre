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
        database_session.query(ServiceOrder).delete()

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

        service_order = ServiceOrder(
            id=SEED_SERVICE_ORDER_ID,
            quote_id=quote.id,
            company_id=company.id,
            project_name="Tradução de contrato societário",
            deadline=datetime.now(UTC) + timedelta(days=15),
        )

        for translation_item in quote.items:
            service_order.items.append(
                ServiceOrderItem(
                    quote_translation_item_id=translation_item.id,
                    source_language=translation_item.source_language,
                    target_language=translation_item.target_language,
                    document_type=translation_item.document_type,
                    file_url=translation_item.file_url,
                    price=translation_item.estimated_value,
                )
            )

        database_session.add(service_order)
        database_session.commit()

        return [str(service_order.id)]
    finally:
        if should_close_session:
            database_session.close()
