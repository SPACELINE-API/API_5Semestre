import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.quotes.models.additional_service import AdditionalService
from app.modules.quotes.repositories.additional_service_repository import (
    AdditionalServiceRepository,
)
from app.modules.quotes.repositories.quote_repository import QuoteRepository
from app.modules.quotes.schemas.additional_service import AdditionalServiceCreate
from app.modules.service_orders.repositories.service_order_repository import (
    ServiceOrderRepository,
)

class AdditionalServiceNotFoundError(Exception):
    pass

class AdditionalServiceConflictError(Exception):
    pass

class AdditionalServiceService:
    def __init__(self, db: Session):
        self.repository = AdditionalServiceRepository(db)
        self.quote_repository = QuoteRepository(db)
        self.service_order_repository = ServiceOrderRepository(db)

    def create_additional_service(self, payload: AdditionalServiceCreate) -> AdditionalService:
        quote_id = self._resolve_quote_id(payload)
        additional_service = AdditionalService(
            quote_id=quote_id,
            service_order_id=payload.service_order_id,
            description=payload.description,
            price=payload.price,
        )
        try:
            return self.repository.create_additional_service(additional_service)
        except IntegrityError as exc:
            raise AdditionalServiceConflictError(
                "Já existe um serviço adicional com essa descrição neste orçamento"
            ) from exc

    def get_additional_service(self, service_id: uuid.UUID) -> AdditionalService:
        additional_service = self.repository.get_additional_service_by_id(service_id)
        if additional_service is None:
            raise AdditionalServiceNotFoundError("Serviço adicional não encontrado")
        return additional_service

    def list_additional_services(
        self,
        quote_id: uuid.UUID | None = None,
        service_order_id: uuid.UUID | None = None,
    ) -> list[AdditionalService]:
        if (quote_id is None) == (service_order_id is None):
            raise ValueError("Informe apenas um entre quote_id e service_order_id")

        if service_order_id is not None:
            if self.service_order_repository.get_by_id(service_order_id) is None:
                raise AdditionalServiceNotFoundError("Ordem de serviço não encontrada")
            return self.repository.list_additional_services_by_service_order(service_order_id)

        if self.quote_repository.get_by_id(quote_id) is None:
            raise AdditionalServiceNotFoundError("Orçamento não encontrado")
        return self.repository.list_additional_services_by_quote(quote_id)

    def delete_additional_service(self, service_id: uuid.UUID) -> None:
        additional_service = self.get_additional_service(service_id)
        self.repository.delete_additional_service(additional_service)

    def _resolve_quote_id(self, payload: AdditionalServiceCreate) -> uuid.UUID:
        if payload.service_order_id is not None:
            service_order = self.service_order_repository.get_by_id(payload.service_order_id)
            if service_order is None:
                raise AdditionalServiceNotFoundError("Ordem de serviço não encontrada")
            return service_order.quote_id

        quote = self.quote_repository.get_by_id(payload.quote_id)
        if quote is None:
            raise AdditionalServiceNotFoundError("Orçamento não encontrado")
        return quote.id