import hashlib
import io
import logging
import secrets
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.clients.models.company import Company
from app.modules.contacts.models.contact import Contact
from app.modules.quotes.models.quote import (
    QUOTE_STATUS_APPROVED,
    QUOTE_STATUS_CANCELLED,
    QUOTE_STATUS_DRAFT,
    QUOTE_STATUS_PENDING,
    QUOTE_STATUS_REPROVED,
    Quote,
)
from app.modules.quotes.models.quote_audit_log import QUOTE_AUDIT_ACTION_REOPEN, QuoteAuditLog
from app.modules.quotes.repositories.quote_repository import QuoteRepository
from app.modules.quotes.repositories.request_repository import RequestRepository
from app.modules.quotes.schemas.quote import (
    QuoteCreate,
    QuoteReopenRequest,
    QuoteStatusUpdate,
    QuoteUpdate,
)
from app.modules.quotes.services.quote_expiration import (
    cancel_expired_quote,
    expire_overdue_quotes,
    is_quote_expired,
)
from app.modules.quotes.services.quote_lock import ensure_quote_is_editable
from app.modules.quotes.services.quote_sent_email import (
    build_approval_url,
    send_quote_sent_email,
)
from app.modules.quotes.services.receipt_formatting import SAO_PAULO_TIMEZONE
from app.modules.quotes.services.receipt_service import QuoteReceiptService
from app.modules.quotes.services.storage import upload_quote_document
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_item import ServiceOrderItem
from app.modules.service_orders.services.quote_sync_service import (
    record_initial_version,
    sync_service_order_with_quote,
)

logger = logging.getLogger(__name__)

REOPENABLE_STATUSES = (QUOTE_STATUS_PENDING, QUOTE_STATUS_APPROVED, QUOTE_STATUS_REPROVED)

DECISION_BLOCKED_MESSAGES = {
    QUOTE_STATUS_DRAFT: "Envie o orçamento ao cliente antes de registrar a decisão.",
    QUOTE_STATUS_APPROVED: "Este orçamento já foi aprovado.",
    QUOTE_STATUS_REPROVED: "Este orçamento já foi reprovado.",
    QUOTE_STATUS_CANCELLED: "Este orçamento foi cancelado porque o prazo de validade expirou.",
}

SEND_BLOCKED_MESSAGES = {
    QUOTE_STATUS_PENDING: "Este orçamento já foi enviado e está aguardando aprovação do cliente.",
    QUOTE_STATUS_APPROVED: "Este orçamento já foi aprovado.",
    QUOTE_STATUS_REPROVED: "Este orçamento foi reprovado.",
    QUOTE_STATUS_CANCELLED: "Este orçamento foi cancelado porque o prazo de validade expirou.",
}

INVALID_CUSTOMER_LINK_MESSAGE = (
    "Este link de orçamento não é válido. Use o link mais recente enviado por e-mail."
)


def hash_customer_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


REOPEN_BLOCKED_MESSAGES = {
    QUOTE_STATUS_DRAFT: "Este orçamento já está em preparação e pode ser alterado.",
    QUOTE_STATUS_CANCELLED: (
        "Orçamentos cancelados por prazo de validade expirado não podem ser reabertos."
    ),
}


class QuoteService:
    def __init__(self, db: Session):
        self.db = db
        self.quote_repository = QuoteRepository(db)
        self.request_repository = RequestRepository(db)

    def create_quote(self, quote_data: QuoteCreate) -> Quote:
        self._validate_customer_links(quote_data.company_id, quote_data.contact_id)
        quote = Quote(
            status=QUOTE_STATUS_DRAFT,
            company_id=quote_data.company_id,
            contact_id=quote_data.contact_id,
        )
        self.db.add(quote)
        self.db.commit()
        self.db.refresh(quote)
        return quote

    def update_quote(self, quote_id: uuid.UUID, data: QuoteUpdate) -> Quote:
        quote = self.db.query(Quote).filter(Quote.id == quote_id).first()
        if quote is None:
            raise HTTPException(status_code=404, detail="Orçamento não encontrado.")
        ensure_quote_is_editable(quote)

        update_data = data.model_dump(exclude_unset=True)
        company_id = update_data.get("company_id", quote.company_id)
        contact_id = update_data.get("contact_id", quote.contact_id)
        self._validate_customer_links(company_id, contact_id)

        for field, value in update_data.items():
            setattr(quote, field, value)

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
        expire_overdue_quotes(self.db)
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
        quote = self._get_quote_for_update(quote_id)
        return self._decide(
            quote,
            data,
            actor_id=uuid.UUID(current_user.id),
            actor_email=current_user.email,
        )

    def get_for_customer(self, raw_token: str) -> Quote:
        quote = self._get_quote_by_customer_token(raw_token)
        if is_quote_expired(quote):
            cancel_expired_quote(self.db, quote)
            self.db.commit()
            self.db.refresh(quote)
        return quote

    def decide_as_customer(self, raw_token: str, data: QuoteStatusUpdate) -> Quote:
        quote = self._get_quote_by_customer_token(raw_token)
        quote = self._get_quote_for_update(quote.id)
        return self._decide(quote, data, actor_id=None, actor_email=quote.sent_to_customer_email)

    def _decide(
        self,
        quote: Quote,
        data: QuoteStatusUpdate,
        *,
        actor_id: uuid.UUID | None,
        actor_email: str | None,
    ) -> Quote:
        if quote.status != QUOTE_STATUS_PENDING:
            reason = DECISION_BLOCKED_MESSAGES.get(
                quote.status, "Este orçamento não pode receber uma decisão."
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"{reason} Somente orçamentos aguardando aprovação podem ser aprovados "
                    "ou reprovados."
                ),
            )

        if data.status == "approved":
            self._ensure_ready_for_approval(quote)
            if quote.service_orders:
                sync_service_order_with_quote(self.db, quote, quote.service_orders[0], actor_email)
            else:
                service_order = self._build_service_order(quote)
                quote.service_orders.append(service_order)
                self.db.flush()
                record_initial_version(self.db, service_order, actor_email)

        approved = data.status == "approved"
        decided_at = datetime.now(UTC)
        quote.status = data.status
        quote.approved_at = decided_at if approved else None
        quote.approved_by = actor_id if approved else None
        quote.approved_by_email = actor_email if approved else None
        quote.reproved_at = None if approved else decided_at
        quote.reproved_by = None if approved else actor_id
        quote.reproved_by_email = None if approved else actor_email
        quote.reproval_reason = None if approved else (data.reproval_reason or "").strip()
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Não foi possível registrar a decisão e gerar a ordem de serviço.",
            ) from None
        self.db.refresh(quote)

        if approved:
            try:
                QuoteReceiptService(self.db).create_receipt(quote)
            except Exception:
                logger.exception("Falha ao gerar comprovante do orçamento %s", quote.id)

        return quote

    def _ensure_ready_for_approval(self, quote: Quote) -> None:
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
        if any(not (item.file_url or "").strip() for item in quote.items):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Anexe o arquivo de todos os documentos antes de aprovar o orçamento.",
            )

    def _build_service_order(self, quote: Quote) -> ServiceOrder:
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
        return service_order

    def send_to_customer(self, quote_id: uuid.UUID) -> Quote:
        quote = self._get_quote_for_update(quote_id)
        if quote.status != QUOTE_STATUS_DRAFT:
            reason = SEND_BLOCKED_MESSAGES.get(quote.status, "Este orçamento não pode ser enviado.")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"{reason} Somente orçamentos em preparação podem ser enviados ao cliente."
                ),
            )

        if not quote.service_orders:
            self._ensure_ready_for_send(quote)
        recipient_email, recipient_name = self._customer_recipient(quote)

        raw_token = secrets.token_urlsafe(32)
        valid_until = quote.valid_until
        try:
            send_quote_sent_email(
                quote,
                to_email=recipient_email,
                customer_name=recipient_name,
                approval_url=build_approval_url(raw_token),
                valid_until=(
                    valid_until.astimezone(SAO_PAULO_TIMEZONE).strftime("%d/%m/%Y")
                    if isinstance(valid_until, datetime)
                    else "-"
                ),
                is_update=quote.sent_to_customer_at is not None,
            )
        except Exception:
            logger.exception("Falha ao enviar o orçamento %s ao cliente", quote.id)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "Não foi possível enviar o e-mail do orçamento ao cliente. "
                    "O orçamento continua em preparação; tente novamente."
                ),
            ) from None

        quote.status = QUOTE_STATUS_PENDING
        quote.customer_access_token_hash = hash_customer_token(raw_token)
        quote.sent_to_customer_at = datetime.now(UTC)
        quote.sent_to_customer_email = recipient_email
        self.db.commit()
        self.db.refresh(quote)
        return quote

    def _ensure_ready_for_send(self, quote: Quote) -> None:
        if not quote.company_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Vincule uma empresa ao orçamento antes de enviá-lo ao cliente.",
            )
        if not quote.items:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Adicione ao menos um documento ao orçamento antes de enviá-lo ao cliente.",
            )
        if any(not (item.file_url or "").strip() for item in quote.items):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Anexe o arquivo de todos os documentos antes de enviar o orçamento.",
            )

    def _customer_recipient(self, quote: Quote) -> tuple[str, str]:
        contact = quote.contact
        company = quote.company
        candidates = [
            (contact.email if contact else None, contact.name if contact else None),
            (quote.email, quote.customer_name),
            (company.email if company else None, company.trade_name if company else None),
        ]
        for email, name in candidates:
            if email and email.strip():
                return email.strip(), (name or quote.customer_name or "cliente").strip()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Informe um e-mail de contato no orçamento antes de enviá-lo ao cliente.",
        )

    def _get_quote_by_customer_token(self, raw_token: str) -> Quote:
        quote = None
        if raw_token:
            quote = (
                self.db.query(Quote)
                .filter(Quote.customer_access_token_hash == hash_customer_token(raw_token))
                .first()
            )
        if quote is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=INVALID_CUSTOMER_LINK_MESSAGE,
            )
        return quote

    def reopen(
        self,
        quote_id: uuid.UUID,
        data: QuoteReopenRequest,
        current_user: SupabaseAuthenticatedUser,
    ) -> Quote:
        quote = self._get_quote_for_update(quote_id)
        if quote.status not in REOPENABLE_STATUSES:
            reason = REOPEN_BLOCKED_MESSAGES.get(
                quote.status, "Este orçamento não pode ser reaberto."
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"{reason} Somente orçamentos aguardando aprovação, aprovados ou "
                    "reprovados podem ser reabertos."
                ),
            )

        previous_status = quote.status
        quote.status = QUOTE_STATUS_DRAFT
        quote.validity_starts_at = datetime.now(UTC)
        quote.customer_access_token_hash = None
        self.db.add(
            QuoteAuditLog(
                quote_id=quote.id,
                action=QUOTE_AUDIT_ACTION_REOPEN,
                previous_status=previous_status,
                new_status=QUOTE_STATUS_DRAFT,
                reason=data.reason,
                actor_user_id=uuid.UUID(current_user.id),
                actor_email=current_user.email,
            )
        )
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Não foi possível reabrir o orçamento.",
            ) from None
        self.db.refresh(quote)
        return quote

    def _get_quote_for_update(self, quote_id: uuid.UUID) -> Quote:
        quote = self.db.query(Quote).filter(Quote.id == quote_id).with_for_update().first()
        if quote is None:
            raise HTTPException(status_code=404, detail="Orçamento não encontrado.")
        if is_quote_expired(quote):
            cancel_expired_quote(self.db, quote)
            self.db.commit()
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

        document_file_url = request.document_url
        if document_file_url is None and request.document:
            document_file_url = upload_quote_document(
                filename=request.document_filename or "documento",
                file_data=io.BytesIO(request.document),
                content_type=request.document_content_type or "application/octet-stream",
            )

        try:
            return self.quote_repository.create_from_request(request, document_file_url)
        except Exception:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Não foi possível gerar o orçamento.",
            ) from None
