import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session, selectinload

from app.modules.quotes.models.quote import Quote
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_item import (
    STATUS_CONCLUIDA,
    STATUS_EM_ANALISE,
    STATUS_EM_ANDAMENTO,
    STATUS_PENDENTE,
    ServiceOrderItem,
)
from app.modules.service_orders.schemas.service_order import (
    GenerateServiceOrderRequest,
    ServiceOrderItemResponse,
    ServiceOrderResponse,
)

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
        status=compute_aggregate_status(service_order.items),
        items=[ServiceOrderItemResponse.model_validate(item) for item in service_order.items],
        created_at=service_order.created_at,
        updated_at=service_order.updated_at,
    )


class ServiceOrderService:
    def __init__(self, db: Session):
        self.db = db

    def generate_from_quote(self, data: GenerateServiceOrderRequest) -> ServiceOrderResponse:
        quote = self.db.query(Quote).filter(Quote.id == data.quote_id).first()
        if not quote:
            raise HTTPException(status_code=404, detail="Orçamento não encontrado")

        if not quote.items:
            raise HTTPException(
                status_code=422,
                detail="Orçamento não possui itens de tradução",
            )

        service_order = ServiceOrder(
            quote_id=data.quote_id,
            company_id=data.company_id,
            project_name=data.project_name,
            deadline=data.deadline,
        )

        for translation_item in quote.items:
            service_order.items.append(
                ServiceOrderItem(
                    quote_translation_item_id=translation_item.id,
                    source_language=translation_item.source_language,
                    target_language=translation_item.target_language,
                    document_type=translation_item.document_type,
                    price=translation_item.estimated_value,
                )
            )

        self.db.add(service_order)
        self.db.commit()
        self.db.refresh(service_order)

        return to_response(service_order)

    def list_service_orders(self) -> list[ServiceOrderResponse]:
        service_orders = self.db.query(ServiceOrder).options(selectinload(ServiceOrder.items)).all()
        return [to_response(service_order) for service_order in service_orders]

    def get_service_order(self, service_order_id: uuid.UUID) -> ServiceOrderResponse:
        service_order = (
            self.db.query(ServiceOrder)
            .options(selectinload(ServiceOrder.items))
            .filter(ServiceOrder.id == service_order_id)
            .first()
        )

        if not service_order:
            raise HTTPException(status_code=404, detail="Ordem de serviço não encontrada")

        return to_response(service_order)
