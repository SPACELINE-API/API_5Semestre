import uuid

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_item import ServiceOrderItem


class CompanyRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, company_id: uuid.UUID) -> Company | None:
        return self.db.get(Company, company_id)

    def list_all(self) -> list[Company]:
        return self.db.query(Company).all()

    def search(
        self,
        name: str | None = None,
        status: bool | None = None,
        product: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Company], int]:
        query = self.db.query(Company)

        if name:
            pattern = f"%{name}%"
            query = query.filter(
                or_(Company.legal_name.ilike(pattern), Company.trade_name.ilike(pattern))
            )

        if status is not None:
            query = query.filter(Company.is_active == status)

        if product:
            query = (
                query.join(ServiceOrder, ServiceOrder.company_id == Company.id)
                .join(ServiceOrderItem, ServiceOrderItem.service_order_id == ServiceOrder.id)
                .filter(ServiceOrderItem.document_type.ilike(f"%{product}%"))
                .distinct()
            )

        total = query.count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()

        return items, total

    def add(self, company: Company) -> None:
        self.db.add(company)

    def delete(self, company: Company) -> None:
        self.db.delete(company)

    def commit(self) -> None:
        self.db.commit()

    def rollback(self) -> None:
        self.db.rollback()

    def refresh(self, company: Company) -> None:
        self.db.refresh(company)
