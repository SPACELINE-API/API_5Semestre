import html
import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.contacts.models.contact import Contact
from app.modules.quotes.models.quote import Quote
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_delivery import ServiceOrderDelivery
from app.modules.service_orders.models.service_order_email_template import (
    SERVICE_ORDER_EMAIL_TEMPLATE_KEY,
    ServiceOrderEmailTemplate,
)
from app.modules.service_orders.models.service_order_file import (
    REVIEW_APPROVED,
    ServiceOrderFile,
)
from app.modules.service_orders.models.service_order_item import (
    STATUS_CONCLUIDA,
)
from app.modules.service_orders.schemas.service_order import ServiceOrderDeliveryRequest
from app.modules.service_orders.services.service_order_service import ServiceOrderService
from app.modules.service_orders.services.storage import (
    download_service_order_file,
    get_service_order_storage_path,
    service_order_file_exists,
)
from app.shared.email.smtp_client import send_email


def _render_delivery_email(
    template: ServiceOrderEmailTemplate,
    customer_name: str,
    request: ServiceOrderDeliveryRequest | None = None,
) -> tuple[str, str]:
    safe_customer_name = html.escape(customer_name)
    subject = request.subject_override if request and request.subject_override else template.subject
    body_html = (
        request.body_html_override if request and request.body_html_override else template.body_html
    )
    body = body_html.replace("{{nome_cliente}}", safe_customer_name)
    return subject.replace("{{nome_cliente}}", customer_name), body


class ServiceOrderDeliveryService:
    def __init__(self, db: Session):
        self.db = db

    def _get_recipient(self, service_order: ServiceOrder) -> str:
        quote = self.db.query(Quote).filter(Quote.id == service_order.quote_id).first()
        if not quote:
            raise HTTPException(status_code=409, detail="Orçamento da ordem não encontrado.")
        contact = (
            self.db.query(Contact).filter(Contact.id == quote.contact_id).first()
            if quote.contact_id
            else None
        )
        if contact:
            return contact.email
        if quote.email:
            return quote.email
        if quote.request and quote.request.email:
            return quote.request.email

        company = self.db.query(Company).filter(Company.id == service_order.company_id).first()
        if company:
            return company.email
        raise HTTPException(
            status_code=409,
            detail="A ordem de serviço não possui e-mail de cliente para envio.",
        )

    def _get_customer_name(self, service_order: ServiceOrder) -> str:
        quote = self.db.query(Quote).filter(Quote.id == service_order.quote_id).first()
        if not quote:
            return "cliente"
        if quote.customer_name:
            return quote.customer_name
        if quote.contact_id:
            contact = self.db.query(Contact).filter(Contact.id == quote.contact_id).first()
            if contact:
                return contact.name
        if quote.request and quote.request.customer_name:
            return quote.request.customer_name
        company = self.db.query(Company).filter(Company.id == service_order.company_id).first()
        return company.trade_name if company else "cliente"

    @staticmethod
    def _current_output_documents(
        documents: list[ServiceOrderFile],
    ) -> list[ServiceOrderFile]:
        latest_by_item = {}
        unlinked_documents = []
        for document in documents:
            if document.service_order_item_id is None:
                unlinked_documents.append(document)
            else:
                latest_by_item[document.service_order_item_id] = document
        return [*unlinked_documents, *latest_by_item.values()]

    def _complete_order_if_ready(self, service_order: ServiceOrder) -> bool:
        """Conclude an order only when the current output of every item was approved and sent.

        Older versions that were rejected remain in the history, but must not block the
        order once a newer approved version has been delivered.
        """
        items = list(service_order.items)
        output_files = (
            self.db.query(ServiceOrderFile)
            .filter(
                ServiceOrderFile.service_order_id == service_order.id,
                ServiceOrderFile.direction == "saida",
            )
            .order_by(ServiceOrderFile.uploaded_at.asc(), ServiceOrderFile.id.asc())
            .all()
        )

        current_documents = self._current_output_documents(output_files)
        latest_by_item = {
            document.service_order_item_id: document
            for document in current_documents
            if document.service_order_item_id is not None
        }
        unlinked_files = [
            document
            for document in current_documents
            if document.service_order_item_id is None and document.review_status == REVIEW_APPROVED
        ]

        if any(
            document.delivery_status != "sent" or document.review_status != REVIEW_APPROVED
            for document in unlinked_files
        ):
            return False

        for item in items:
            latest_item_file = latest_by_item.get(item.id)
            if latest_item_file is None:
                if not unlinked_files:
                    return False
                continue
            if (
                latest_item_file.delivery_status != "sent"
                or latest_item_file.review_status != REVIEW_APPROVED
            ):
                return False

        completed_at = datetime.now(UTC)
        for item in items:
            if item.status != STATUS_CONCLUIDA:
                item.status = STATUS_CONCLUIDA
                item.completed_at = completed_at
        self.db.commit()
        return True

    def finalize_already_sent_order(self, service_order_id: uuid.UUID) -> ServiceOrder:
        service_order = ServiceOrderService(self.db)._get_service_order_or_404(service_order_id)
        if not service_order.items:
            raise HTTPException(
                status_code=409,
                detail="A ordem de serviço não possui itens para concluir.",
            )
        if not self._complete_order_if_ready(service_order):
            raise HTTPException(
                status_code=409,
                detail=("A ordem ainda possui documentos pendentes de aprovação ou envio."),
            )
        return service_order

    def send_translated_documents(
        self,
        service_order_id: uuid.UUID,
        email_override: ServiceOrderDeliveryRequest | None = None,
    ) -> list[ServiceOrderDelivery]:
        service_order_service = ServiceOrderService(self.db)
        service_order = service_order_service._get_service_order_or_404(service_order_id)
        all_documents = (
            self.db.query(ServiceOrderFile)
            .filter(
                ServiceOrderFile.service_order_id == service_order.id,
                ServiceOrderFile.direction == "saida",
            )
            .order_by(ServiceOrderFile.uploaded_at.asc())
            .all()
        )
        current_documents = self._current_output_documents(all_documents)
        current_document_ids = {document.id for document in current_documents}
        if email_override and email_override.file_ids is not None:
            requested_ids = list(dict.fromkeys(email_override.file_ids))
            if not requested_ids:
                raise HTTPException(status_code=409, detail="Selecione ao menos um documento.")

            documents_by_id = {document.id: document for document in all_documents}
            missing_ids = set(requested_ids) - documents_by_id.keys()
            if missing_ids:
                raise HTTPException(
                    status_code=404,
                    detail="Um ou mais documentos não pertencem a esta ordem de serviço.",
                )

            documents = [documents_by_id[file_id] for file_id in requested_ids]
            if any(document.id not in current_document_ids for document in documents):
                raise HTTPException(
                    status_code=409,
                    detail="Uma ou mais versões selecionadas foram substituídas por arquivos atuais.",
                )
            if any(document.review_status != REVIEW_APPROVED for document in documents):
                raise HTTPException(
                    status_code=409,
                    detail="Um ou mais documentos selecionados ainda não foram aprovados.",
                )
            if any(document.delivery_status == "sent" for document in documents):
                raise HTTPException(
                    status_code=409,
                    detail="Um ou mais documentos selecionados já foram enviados.",
                )
        else:
            documents = [
                document
                for document in current_documents
                if document.delivery_status in ("not_sent", "pending", "failed")
                and document.review_status == REVIEW_APPROVED
            ]

        if not documents:
            raise HTTPException(
                status_code=409,
                detail="A ordem de serviço não possui documentos pendentes para envio.",
            )
        recipient = self._get_recipient(service_order)
        customer_name = self._get_customer_name(service_order)
        template = self.db.get(ServiceOrderEmailTemplate, SERVICE_ORDER_EMAIL_TEMPLATE_KEY)
        if template is None:
            raise HTTPException(
                status_code=409,
                detail="Template de envio não encontrado. Execute o seed do backend.",
            )
        successful_deliveries = []
        delivery_attempts = []
        attachments = []

        for document in documents:
            attempt = ServiceOrderDelivery(
                service_order_id=service_order.id,
                document_file_id=document.id,
                recipient_email=recipient,
                template_key=template.key,
                status="pending",
            )
            self.db.add(attempt)
            document.delivery_status = "pending"
            delivery_attempts.append((attempt, document))

            try:
                storage_path = document.storage_path or get_service_order_storage_path(
                    document.file_url
                )
                if not storage_path:
                    raise HTTPException(
                        status_code=409,
                        detail="Documento sem caminho válido no Storage.",
                    )
                if not service_order_file_exists(storage_path):
                    raise HTTPException(
                        status_code=404,
                        detail=f"O documento {document.filename} não foi encontrado no Storage.",
                    )
                if document.storage_path is None:
                    document.storage_path = storage_path
                content = download_service_order_file(storage_path)
                content_type = document.content_type or "application/octet-stream"
                attachments.append((document.filename, content, content_type))
            except Exception as error:
                detail = error.detail if isinstance(error, HTTPException) else str(error)
                for pending_attempt, pending_document in delivery_attempts:
                    pending_attempt.status = "failed"
                    pending_attempt.error_message = detail[:4000]
                    pending_document.delivery_status = "failed"
                self.db.commit()
                raise HTTPException(
                    status_code=502,
                    detail="Falha ao enviar documento traduzido; tentativa registrada.",
                ) from error

        try:
            subject, body = _render_delivery_email(template, customer_name, email_override)
            send_email(
                to=recipient,
                subject=subject,
                html_body=body,
                attachments=attachments,
            )
        except Exception as error:
            detail = error.detail if isinstance(error, HTTPException) else str(error)
            for attempt, document in delivery_attempts:
                attempt.status = "failed"
                attempt.error_message = detail[:4000]
                document.delivery_status = "failed"
            self.db.commit()
            raise HTTPException(
                status_code=502,
                detail="Falha ao enviar documentos traduzidos; tentativa registrada.",
            ) from error

        for attempt, document in delivery_attempts:
            attempt.status = "sent"
            attempt.sent_at = func.now()
            document.delivery_status = "sent"
            successful_deliveries.append(attempt)
        self.db.commit()
        for attempt in successful_deliveries:
            self.db.refresh(attempt)

        self._complete_order_if_ready(service_order)

        return successful_deliveries
