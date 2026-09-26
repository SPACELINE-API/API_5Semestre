import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.clients.models.company import Company
from app.modules.contacts.models.contact import Contact
from app.modules.quotes.models.quote import Quote
from app.modules.quotes.repositories.quote_repository import QuoteRepository
from app.modules.quotes.repositories.request_repository import RequestRepository
from app.modules.quotes.schemas.quote import QuoteCreate, QuoteStatusUpdate
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_item import ServiceOrderItem


class QuoteService:
    def __init__(self, db: Session):
        self.db = db
        self.quote_repository = QuoteRepository(db)
        self.request_repository = RequestRepository(db)

    def create_quote(self, quote_data: QuoteCreate) -> Quote:
        self._validate_customer_links(quote_data.company_id, quote_data.contact_id)
        quote = Quote(
            status="pending",
            company_id=quote_data.company_id,
            contact_id=quote_data.contact_id,
        )
        self.db.add(quote)
        self.db.commit()
        self.db.refresh(quote)
        return quote

    def list_quotes(
        self,
        *,
        page: int,
        page_size: int,
        search: str | None = None,
        status_filter: str | None = None,
    ) -> dict:
        quotes, total = self.quote_repository.list_all(
            page=page,
            page_size=page_size,
            search=search,
            status=status_filter,
        )
        return {
            "items": quotes,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }

    def update_status(
        self,
        quote_id: uuid.UUID,
        data: QuoteStatusUpdate,
        current_user: SupabaseAuthenticatedUser,
    ) -> Quote:
        quote = self.db.query(Quote).filter(Quote.id == quote_id).with_for_update().first()
        if quote is None:
            raise HTTPException(status_code=404, detail="Orçamento não encontrado.")
        if quote.status != "pending":
            raise HTTPException(
                status_code=409,
                detail="Somente orçamentos pendentes podem receber uma decisão.",
            )

        if data.status == "approved":
            if not quote.service_orders:
                if not quote.company_id:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Vincule uma empresa ao orçamento antes de aprová-lo.",
                    )
                if not quote.items:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Adicione ao menos um documento ao orçamento antes de aprová-lo.",
                    )

                project_name = (quote.customer_need or "").strip()
                if not project_name:
                    project_name = next(
                        (
                            item.document_type.strip()
                            for item in quote.items
                            if item.document_type and item.document_type.strip()
                        ),
                        "Tradução de documentos",
                    )
                service_order = ServiceOrder(
                    quote_id=quote.id,
                    company_id=quote.company_id,
                    project_name=project_name[:150],
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
                quote.service_orders.append(service_order)

        decided_at = datetime.now(UTC)
        quote.status = data.status
        quote.approved_at = decided_at if data.status == "approved" else None
        quote.approved_by = uuid.UUID(current_user.id) if data.status == "approved" else None
        quote.approved_by_email = current_user.email if data.status == "approved" else None
        quote.reproved_at = decided_at if data.status == "reproved" else None
        quote.reproved_by = uuid.UUID(current_user.id) if data.status == "reproved" else None
        quote.reproved_by_email = current_user.email if data.status == "reproved" else None
        quote.reproval_reason = (
            (data.reproval_reason or "").strip() if data.status == "reproved" else None
        )
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Não foi possível registrar a decisão e gerar a ordem de serviço.",
            ) from None
        self.db.refresh(quote)
        return quote

    def _validate_customer_links(self, company_id, contact_id) -> None:
        if contact_id and not company_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Informe a empresa associada ao contato.",
            )

        if company_id and self.db.get(Company, company_id) is None:
            raise HTTPException(status_code=404, detail="Empresa associada não encontrada.")

        if contact_id:
            contact = self.db.get(Contact, contact_id)
            if contact is None:
                raise HTTPException(status_code=404, detail="Contato associado não encontrado.")
            if contact.company_id != company_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="O contato informado não pertence à empresa selecionada.",
                )

    def generate_from_approved_request(self, request_id: uuid.UUID) -> Quote:
        request = self.request_repository.get_by_id(request_id)
        if request is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Requisição não encontrada."
            )

        request_status = getattr(request.status, "value", request.status)
        if request_status != "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A requisição precisa estar aprovada.",
            )

        if self.quote_repository.get_by_request_id(request_id) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe um orçamento para esta requisição.",
            )

        required_fields = (
            request.customer_name,
            request.enterprise,
            request.email,
            request.original_language,
            request.translation_language,
            request.customer_need,
        )
        if any(not field or not field.strip() for field in required_fields):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A requisição possui dados obrigatórios inválidos.",
            )

        try:
            return self.quote_repository.create_from_request(request)
        except Exception:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Não foi possível gerar o orçamento.",
            ) from None
