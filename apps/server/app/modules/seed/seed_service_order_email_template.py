from sqlalchemy.orm import Session

from app.modules.service_orders.models.service_order_email_template import (
    SERVICE_ORDER_EMAIL_TEMPLATE_KEY,
    TRANSLATOR_INVITE_EMAIL_TEMPLATE_KEY,
    ServiceOrderEmailTemplate,
)
from app.shared.database import get_session_factory
from app.shared.email.template_renderer import TEMPLATES_DIR

DELIVERY_TEMPLATE_PATH = TEMPLATES_DIR / "translated_document_delivery.html"
INVITE_TEMPLATE_PATH = TEMPLATES_DIR / "translator_invite.html"

DEFAULT_SUBJECT = "Tradução concluída - Aliança Traduções"
DEFAULT_BODY_HTML = (
    DELIVERY_TEMPLATE_PATH.read_text(encoding="utf-8")
    if DELIVERY_TEMPLATE_PATH.exists()
    else (
        "<p>Olá, {{nome_cliente}}!</p>"
        "<p>Temos o prazer de informar que a tradução solicitada "
        "foi concluída com sucesso!</p>"
        "<p>O documento traduzido está disponível em anexo a este e-mail.</p>"
        "<p>Agradecemos pela confiança em nossos serviços. "
        "Caso tenha alguma dúvida ou necessite de esclarecimentos, "
        "nossa equipe permanece à disposição.</p>"
        "<p>Atenciosamente,<br><strong>Equipe Aliança Traduções</strong></p>"
    )
)

DEFAULT_INVITE_SUBJECT = "Novo serviço de tradução disponível - Aliança Traduções"
DEFAULT_INVITE_BODY_HTML = (
    INVITE_TEMPLATE_PATH.read_text(encoding="utf-8")
    if INVITE_TEMPLATE_PATH.exists()
    else (
        "<p>Olá, {{nome_tradutor}}!</p>"
        "<p>Você foi convidado(a) para um novo serviço de tradução.</p>"
        "<ul>"
        "<li><strong>Idiomas:</strong> {{idioma_origem}} → {{idioma_destino}}</li>"
        "<li><strong>Tipo de documento:</strong> {{tipo_documento}}</li>"
        "<li><strong>Prazo:</strong> {{prazo}}</li>"
        "</ul>"
        '<p><a href="{{link_convite}}">Ver documento e responder ao convite</a></p>'
        "<p>Atenciosamente,<br><strong>Equipe Aliança Traduções</strong></p>"
    )
)


def _upsert_template(database_session: Session, key: str, subject: str, body_html: str) -> None:
    template = database_session.get(ServiceOrderEmailTemplate, key)
    if template is None:
        database_session.add(
            ServiceOrderEmailTemplate(key=key, subject=subject, body_html=body_html)
        )
    else:
        template.subject = subject
        template.body_html = body_html


def seed_service_order_email_template(*, db: Session | None = None) -> str:
    database_session = db or get_session_factory()()
    should_close_session = db is None

    try:
        _upsert_template(
            database_session, SERVICE_ORDER_EMAIL_TEMPLATE_KEY, DEFAULT_SUBJECT, DEFAULT_BODY_HTML
        )
        _upsert_template(
            database_session,
            TRANSLATOR_INVITE_EMAIL_TEMPLATE_KEY,
            DEFAULT_INVITE_SUBJECT,
            DEFAULT_INVITE_BODY_HTML,
        )
        database_session.commit()
        return SERVICE_ORDER_EMAIL_TEMPLATE_KEY
    finally:
        if should_close_session:
            database_session.close()
