from sqlalchemy.orm import Session, selectinload

from app.modules.seed.seed_service_orders import SEED_SERVICE_ORDER_ID
from app.modules.seed.seed_translators import SEED_TRANSLATORS
from app.modules.service_orders.models.invite import ServiceOrderItemInvite
from app.modules.service_orders.models.service_order import ServiceOrder
from app.shared.database import get_session_factory


def seed_invites(*, db: Session | None = None) -> list[str]:
    database_session = db or get_session_factory()()
    should_close_session = db is None

    try:
        database_session.query(ServiceOrderItemInvite).delete()

        service_order = (
            database_session.query(ServiceOrder)
            .options(selectinload(ServiceOrder.items))
            .filter(ServiceOrder.id == SEED_SERVICE_ORDER_ID)
            .first()
        )

        if not service_order or not service_order.items:
            database_session.commit()
            return []

        item = service_order.items[0]
        seeded_ids = []

        for seed_translator in SEED_TRANSLATORS:
            invite = ServiceOrderItemInvite(
                service_order_item_id=item.id,
                translator_id=seed_translator.id,
            )
            database_session.add(invite)
            seeded_ids.append(str(seed_translator.id))

        database_session.commit()

        return seeded_ids
    finally:
        if should_close_session:
            database_session.close()
