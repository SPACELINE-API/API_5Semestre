import uuid
from typing import BinaryIO

from fastapi import HTTPException
from sqlalchemy.orm import Session, selectinload

from app.modules.clients.models.company import Company
from app.modules.quotes.models.quote import Quote
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_file import ServiceOrderFile
from app.modules.service_orders.models.service_order_item import (
    STATUS_CONCLUIDA,
    STATUS_EM_ANALISE,
    STATUS_EM_ANDAMENTO,
    STATUS_PENDENTE,
    ServiceOrderItem,
)
from app.modules.service_orders.schemas.service_order import (
    CreateServiceOrderItemRequest,
    GenerateServiceOrderRequest,
    ServiceOrderFileResponse,
    ServiceOrderItemResponse,
    ServiceOrderResponse,
    UpdateServiceOrderItemRequest,
    UpdateServiceOrderRequest,
)
from app.modules.service_orders.services.storage import upload_service_order_file

_AGGREGATE_STATUS_ORDER = [
    STATUS_PENDENTE,
    STATUS_EM_ANDAMENTO,
    STATUS_EM_ANALISE,
    STATUS_CONCLUIDA,
]


def compute_aggregate_status(items: list[ServiceOrderItem]) -> str:
    if not items:
        return STATUS_PENDENTE

    statuses = {item.status for item in items}
    if statuses == {STATUS_CONCLUIDA}:
        return STATUS_CONCLUIDA

    for status in _AGGREGATE_STATUS_ORDER[1:]:
        if status in statuses:
            return status

    return STATUS_PENDENTE


def to_response(service_order: ServiceOrder) -> ServiceOrderResponse:
    return ServiceOrderResponse(
        id=service_order.id,
        quote_id=service_order.quote_id,
        company_id=service_order.company_id,
        project_name=service_order.project_name,
        deadline=service_order.deadline,
        domain_area=service_order.domain_area,
        price_category=service_order.price_category,
        internal_notes=service_order.internal_notes,
        external_notes=service_order.external_notes,
        status=compute_aggregate_status(service_order.items),
        items=[ServiceOrderItemResponse.model_validate(item) for item in service_order.items],
        files=[ServiceOrderFileResponse.model_validate(file) for file in service_order.files],
        created_at=service_order.created_at,
        updated_at=service_order.updated_at,
    )


class ServiceOrderService:
    def __init__(self, db: Session):
        self.db = db

    def _get_service_order_or_404(self, service_order_id: uuid.UUID) -> ServiceOrder:
        service_order = (
            self.db.query(ServiceOrder)
            .options(selectinload(ServiceOrder.items), selectinload(ServiceOrder.files))
            .join(Quote, ServiceOrder.quote_id == Quote.id)
            .filter(Quote.status == "approved")
            .filter(ServiceOrder.id == service_order_id)
            .first()
        )

        if not service_order:
            raise HTTPException(status_code=404, detail="Ordem de serviço não encontrada")

        return service_order

    def generate_from_quote(self, data: GenerateServiceOrderRequest) -> ServiceOrderResponse:
        quote = self.db.query(Quote).filter(Quote.id == data.quote_id).with_for_update().first()
        if not quote:
            raise HTTPException(status_code=404, detail="Orçamento não encontrado")

        if quote.status != "approved":
            raise HTTPException(
                status_code=409,
                detail="A ordem de serviço só pode ser criada para orçamentos aprovados.",
            )

        if self.db.query(ServiceOrder.id).filter(ServiceOrder.quote_id == quote.id).first():
            raise HTTPException(
                status_code=409,
                detail="Este orçamento já possui uma ordem de serviço.",
            )

        if not quote.items:
            raise HTTPException(
                status_code=422,
                detail="Orçamento não possui itens de tradução",
            )

        company = self.db.query(Company).filter(Company.id == data.company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")

        service_order = ServiceOrder(
            quote_id=data.quote_id,
            company_id=data.company_id,
            project_name=data.project_name,
            deadline=data.deadline,
            domain_area=data.domain_area,
            price_category=data.price_category,
            internal_notes=data.internal_notes,
            external_notes=data.external_notes,
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

        self.db.add(service_order)
        self.db.commit()
        self.db.refresh(service_order)

        return to_response(service_order)

    def update_service_order(
        self, service_order_id: uuid.UUID, data: UpdateServiceOrderRequest
    ) -> ServiceOrderResponse:
        service_order = self._get_service_order_or_404(service_order_id)

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(service_order, field, value)

        self.db.commit()
        self.db.refresh(service_order)

        return to_response(service_order)

    def add_file(
        self,
        service_order_id: uuid.UUID,
        filename: str,
        file_data: BinaryIO,
        content_type: str,
        direction: str,
    ) -> ServiceOrderFileResponse:
        service_order = self._get_service_order_or_404(service_order_id)

        file_url = upload_service_order_file(filename, file_data, content_type)

        service_order_file = ServiceOrderFile(
            service_order_id=service_order.id,
            filename=filename,
            file_url=file_url,
            direction=direction,
        )
        self.db.add(service_order_file)
        self.db.commit()
        self.db.refresh(service_order_file)

        return ServiceOrderFileResponse.model_validate(service_order_file)

    def delete_service_order(self, service_order_id: uuid.UUID) -> None:
        service_order = self._get_service_order_or_404(service_order_id)
        self.db.delete(service_order)
        self.db.commit()

    def add_item(
        self,
        service_order_id: uuid.UUID,
        data: CreateServiceOrderItemRequest,
        filename: str | None = None,
        file_data: BinaryIO | None = None,
        content_type: str | None = None,
    ) -> ServiceOrderItemResponse:
        service_order = self._get_service_order_or_404(service_order_id)

        file_url = None
        if file_data is not None and filename is not None and content_type is not None:
            file_url = upload_service_order_file(filename, file_data, content_type)

        item = ServiceOrderItem(
            service_order_id=service_order.id,
            source_language=data.source_language,
            target_language=data.target_language,
            document_type=data.document_type,
            word_count=data.word_count,
            price=data.price,
            deadline=data.deadline,
            file_url=file_url,
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)

        return ServiceOrderItemResponse.model_validate(item)

    def update_item(
        self,
        item_id: uuid.UUID,
        data: UpdateServiceOrderItemRequest,
        filename: str | None = None,
        file_data: BinaryIO | None = None,
        content_type: str | None = None,
    ) -> ServiceOrderItemResponse:
        item = self.db.query(ServiceOrderItem).filter(ServiceOrderItem.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Item da ordem de serviço não encontrado")

        if not data.source_language or not data.target_language:
            raise HTTPException(
                status_code=422,
                detail="Idioma de origem e idioma de destino são obrigatórios",
            )

        for field, value in data.model_dump().items():
            setattr(item, field, value)

        if file_data is not None and filename is not None and content_type is not None:
            item.file_url = upload_service_order_file(filename, file_data, content_type)

        self.db.commit()
        self.db.refresh(item)

        return ServiceOrderItemResponse.model_validate(item)

    def list_service_orders(self) -> list[ServiceOrderResponse]:
        service_orders = (
            self.db.query(ServiceOrder)
            .options(selectinload(ServiceOrder.items), selectinload(ServiceOrder.files))
            .join(Quote, ServiceOrder.quote_id == Quote.id)
            .filter(Quote.status == "approved")
            .all()
        )
        return [to_response(service_order) for service_order in service_orders]

    def get_service_order(self, service_order_id: uuid.UUID) -> ServiceOrderResponse:
        service_order = self._get_service_order_or_404(service_order_id)
        return to_response(service_order)
