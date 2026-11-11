from html import escape
from pathlib import Path

from app.modules.quotes.models.quote import Quote
from app.modules.quotes.services.receipt_formatting import format_brl, short_quote_code
from app.shared.email.smtp_client import send_email
from app.shared.EnvProvider import env_provider

TEMPLATE_PATH = (
    Path(__file__).resolve().parents[3] / "shared" / "email" / "templates" / "quote_sent.html"
)
LOGO_PATH = Path(__file__).resolve().parent.parent / "assets" / "receipt-logo-alianca.png"
LOGO_CONTENT_ID = "logo-alianca"

ROW_STYLE = "padding: 8px; border-bottom: 1px solid #f0f0f0; color: #555555; font-size: 13px"


def build_approval_url(raw_token: str) -> str:
    return f"{env_provider.get_site_url().rstrip('/')}/aprovar-orcamento?token={raw_token}"


def _row(description: str, detail: str, value: str) -> str:
    detail_html = (
        f'<br /><span style="color: #999999; font-size: 12px">{escape(detail)}</span>'
        if detail
        else ""
    )
    return (
        f'<tr><td style="{ROW_STYLE}">{escape(description)}{detail_html}</td>'
        f'<td align="right" style="{ROW_STYLE}">R$ {escape(value)}</td></tr>'
    )


def build_item_rows(quote: Quote) -> str:
    rows = [
        _row(
            item.document_type or "Tradução de documento",
            f"{item.source_language} → {item.target_language}",
            format_brl(item.estimated_value),
        )
        for item in quote.items
    ]
    rows.extend(
        _row(service.description, "Serviço adicional", format_brl(service.price))
        for service in quote.additional_services
    )
    return "".join(rows)


def render_quote_sent_email(
    quote: Quote,
    *,
    customer_name: str,
    approval_url: str,
    valid_until: str,
    is_update: bool,
) -> tuple[str, str]:
    code = short_quote_code(quote.id)
    company_name = quote.company_name or "a sua empresa"
    if is_update:
        title = f"Orçamento #{code} atualizado para aprovação"
        intro = (
            f"O orçamento de {company_name} foi revisado e precisa de uma nova aprovação. "
            "O link enviado anteriormente não vale mais."
        )
    else:
        title = f"Orçamento #{code} para aprovação"
        intro = f"Preparamos o orçamento abaixo para {company_name}."

    replacements = {
        "{{title}}": escape(title),
        "{{intro}}": escape(intro),
        "{{customer_name}}": escape(customer_name),
        "{{item_rows}}": build_item_rows(quote),
        "{{total_value}}": format_brl(quote.total_value),
        "{{valid_until}}": escape(valid_until),
        "{{approval_url}}": escape(approval_url, quote=True),
    }
    html_body = TEMPLATE_PATH.read_text(encoding="utf-8")
    for placeholder, value in replacements.items():
        html_body = html_body.replace(placeholder, value)
    return title, html_body


def send_quote_sent_email(
    quote: Quote,
    *,
    to_email: str,
    customer_name: str,
    approval_url: str,
    valid_until: str,
    is_update: bool,
) -> None:
    title, html_body = render_quote_sent_email(
        quote,
        customer_name=customer_name,
        approval_url=approval_url,
        valid_until=valid_until,
        is_update=is_update,
    )
    inline_images = []
    if LOGO_PATH.exists():
        inline_images.append((LOGO_CONTENT_ID, LOGO_PATH.read_bytes(), "image/png"))
    send_email(
        to=to_email,
        subject=f"{title} - Aliança Traduções",
        html_body=html_body,
        inline_images=inline_images,
    )
