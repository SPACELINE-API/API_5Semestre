from sqlalchemy.orm import Session

from app.modules.service_orders.models.service_order_email_template import (
    SERVICE_ORDER_EMAIL_TEMPLATE_KEY,
    ServiceOrderEmailTemplate,
)
from app.shared.database import get_session_factory

DEFAULT_SUBJECT = "Tradução concluída"
DEFAULT_BODY_HTML = (
    "<p>Olá, {{nome_cliente}}!</p>"
    "<p>Temos o prazer de informar que a tradução solicitada "
    "foi concluída com sucesso!</p>"
    "<p>O documento traduzido está disponível em anexo a este e-mail.</p>"
    "<p>Agradecemos pela confiança em nossos serviços. "
    "Caso tenha alguma dúvida ou necessite de esclarecimentos, "
    "nossa equipe permanece à disposição.</p>"
    "<p>Atenciosamente,<br><strong>Equipe Aliança Traduções</strong></p>"
)


def seed_service_order_email_template(*, db: Session | None = None) -> str:
    database_session = db or get_session_factory()()
    should_close_session = db is None

    try:
        template = database_session.get(
            ServiceOrderEmailTemplate, SERVICE_ORDER_EMAIL_TEMPLATE_KEY
        )
        if template is None:
            database_session.add(
                ServiceOrderEmailTemplate(
                    key=SERVICE_ORDER_EMAIL_TEMPLATE_KEY,
                    subject=DEFAULT_SUBJECT,
                    body_html=DEFAULT_BODY_HTML,
                )
            )
            database_session.commit()
        return SERVICE_ORDER_EMAIL_TEMPLATE_KEY
    finally:
        if should_close_session:
            database_session.close()
