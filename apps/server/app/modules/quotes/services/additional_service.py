import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.quotes.models.additional_service import AdditionalService
from app.modules.quotes.repositories.additional_service_repository import (
    AdditionalServiceRepository,
)
from app.modules.quotes.repositories.quote_repository import QuoteRepository
from app.modules.quotes.schemas.additional_service import (
    AdditionalServiceCreate,
    AdditionalServiceStatusUpdate,
    AdditionalServiceUpdate,
)

DUPLICATED_DESCRIPTION_MESSAGE = "Já existe um serviço adicional com essa descrição neste orçamento"
COMPLETED_SERVICE_MESSAGE = "Não é possível editar um serviço adicional concluído"


class AdditionalServiceNotFoundError(Exception):
    pass


class AdditionalServiceConflictError(Exception):
    pass


class AdditionalServiceService:
    def __init__(self, db: Session):
        self.repository = AdditionalServiceRepository(db)
        self.quote_repository = QuoteRepository(db)

    def create_additional_service(self, payload: AdditionalServiceCreate) -> AdditionalService:
        self._ensure_quote_exists(payload.quote_id)
        additional_service = AdditionalService(
            quote_id=payload.quote_id,
            description=payload.description,
            price=payload.price,
        )
        try:
            return self.repository.create_additional_service(additional_service)
        except IntegrityError as exc:
            raise AdditionalServiceConflictError(DUPLICATED_DESCRIPTION_MESSAGE) from exc

    def get_additional_service(self, service_id: uuid.UUID) -> AdditionalService:
        additional_service = self.repository.get_additional_service_by_id(service_id)
        if additional_service is None:
            raise AdditionalServiceNotFoundError("Serviço adicional não encontrado")
        return additional_service

    def list_additional_services(self, quote_id: uuid.UUID) -> list[AdditionalService]:
        self._ensure_quote_exists(quote_id)
        return self.repository.list_additional_services_by_quote(quote_id)

    def update_additional_service(
        self, service_id: uuid.UUID, payload: AdditionalServiceUpdate
    ) -> AdditionalService:
        additional_service = self.get_additional_service(service_id)
        if additional_service.status == "approved":
            raise AdditionalServiceConflictError(COMPLETED_SERVICE_MESSAGE)
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(additional_service, field, value)
        try:
            return self.repository.update_additional_service(additional_service)
        except IntegrityError as exc:
            raise AdditionalServiceConflictError(DUPLICATED_DESCRIPTION_MESSAGE) from exc

    def update_additional_service_status(
        self, service_id: uuid.UUID, payload: AdditionalServiceStatusUpdate
    ) -> AdditionalService:
        additional_service = self.get_additional_service(service_id)
        additional_service.status = payload.status
        return self.repository.update_additional_service(additional_service)

    def delete_additional_service(self, service_id: uuid.UUID) -> None:
        additional_service = self.get_additional_service(service_id)
        self.repository.delete_additional_service(additional_service)

    def _ensure_quote_exists(self, quote_id: uuid.UUID) -> None:
        if self.quote_repository.get_by_id(quote_id) is None:
            raise AdditionalServiceNotFoundError("Orçamento não encontrado")
