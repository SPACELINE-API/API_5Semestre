import uuid

from sqlalchemy.orm import Session

from app.modules.service_orders.models.service_order import ServiceOrder


class ServiceOrderRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, service_order_id: uuid.UUID) -> ServiceOrder | None:
        return self.db.get(ServiceOrder, service_order_id)
