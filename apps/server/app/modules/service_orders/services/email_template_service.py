from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.service_orders.models.service_order_email_template import (
    SERVICE_ORDER_EMAIL_TEMPLATE_KEY,
    ServiceOrderEmailTemplate,
)


class ServiceOrderEmailTemplateService:
    def __init__(self, db: Session):
        self.db = db

    def get_template(self) -> ServiceOrderEmailTemplate:
        template = self.db.get(ServiceOrderEmailTemplate, SERVICE_ORDER_EMAIL_TEMPLATE_KEY)
        if template is None:
            raise HTTPException(
                status_code=404,
                detail="Template de envio não encontrado. Execute o seed do backend.",
            )
        return template
