import html
import uuid

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
from app.modules.service_orders.models.service_order_file import ServiceOrderFile
from app.modules.service_orders.services.service_order_service import ServiceOrderService
from app.modules.service_orders.services.storage import (
    download_service_order_file,
    get_service_order_storage_path,
    service_order_file_exists,
)
from app.shared.email.smtp_client import send_email

def _render_delivery_email(
    template: ServiceOrderEmailTemplate, customer_name: str
) -> tuple[str, str]:
    safe_customer_name = html.escape(customer_name)
    body = template.body_html.replace("{{nome_cliente}}", safe_customer_name)
    return template.subject, body


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

    def send_translated_documents(self, service_order_id: uuid.UUID) -> list[ServiceOrderDelivery]:
        service_order_service = ServiceOrderService(self.db)
        service_order = service_order_service._get_service_order_or_404(service_order_id)
        documents = (
            self.db.query(ServiceOrderFile)
            .filter(
                ServiceOrderFile.service_order_id == service_order.id,
                ServiceOrderFile.direction == "saida",
            )
            .order_by(ServiceOrderFile.uploaded_at.asc())
            .all()
        )
        if not documents:
            raise HTTPException(
                status_code=409,
                detail="A ordem de serviço ainda não possui documentos traduzidos de saída.",
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
            self.db.commit()
            self.db.refresh(attempt)

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
                subject, body = _render_delivery_email(template, customer_name)
                content_type = document.content_type or "application/octet-stream"
                send_email(
                    to=recipient,
                    subject=subject,
                    html_body=body,
                    attachments=[(document.filename, content, content_type)],
                )
            except Exception as error:
                detail = error.detail if isinstance(error, HTTPException) else str(error)
                attempt.status = "failed"
                attempt.error_message = detail[:4000]
                document.delivery_status = "failed"
                self.db.commit()
                raise HTTPException(
                    status_code=502,
                    detail="Falha ao enviar documento traduzido; tentativa registrada.",
                ) from error

            attempt.status = "sent"
            attempt.sent_at = func.now()
            document.delivery_status = "sent"
            self.db.commit()
            self.db.refresh(attempt)
            successful_deliveries.append(attempt)

        return successful_deliveries
