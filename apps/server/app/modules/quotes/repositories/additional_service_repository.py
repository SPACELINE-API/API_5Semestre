import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.quotes.models.additional_service import AdditionalService


class AdditionalServiceRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_additional_service(self, additional_service: AdditionalService) -> AdditionalService:
        self.db.add(additional_service)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise
        self.db.refresh(additional_service)
        return additional_service

    def get_additional_service_by_id(self, service_id: uuid.UUID) -> AdditionalService | None:
        return self.db.get(AdditionalService, service_id)

    def list_additional_services_by_quote(self, quote_id: uuid.UUID) -> list[AdditionalService]:
        return (
            self.db.query(AdditionalService)
            .filter(AdditionalService.quote_id == quote_id)
            .order_by(AdditionalService.created_at)
            .all()
        )

    def list_additional_services_by_service_order(
        self, service_order_id: uuid.UUID
    ) -> list[AdditionalService]:
        return (
            self.db.query(AdditionalService)
            .filter(AdditionalService.service_order_id == service_order_id)
            .order_by(AdditionalService.created_at)
            .all()
        )

    def delete_additional_service(self, additional_service: AdditionalService) -> None:
        self.db.delete(additional_service)
        self.db.commit()
