from decimal import Decimal
from pathlib import Path

from app.modules.quotes.services.receipt_formatting import format_brl
from app.shared.email.smtp_client import send_email
from app.shared.email.template_renderer import (
    get_inline_logo,
    render_quote_approved,
)

DEFAULT_TEMPLATE_PATH = (
    Path(__file__).resolve().parents[3] / "shared" / "email" / "templates" / "quote_approved.html"
)


class ReceiptEmailService:
    def __init__(self, template_path: str | None = None):
        self.template_path = template_path or str(DEFAULT_TEMPLATE_PATH)

    def send_quote_approved_email(
        self,
        to_email: str,
        quote_code: str,
        total_value: Decimal,
        approval_date: str,
        pdf_bytes: bytes,
        version: int = 1,
    ) -> None:
        html_body = render_quote_approved(
            quote_code=quote_code,
            total_value_formatted=format_brl(total_value),
            approval_date=approval_date,
            template_path=self.template_path,
        )

        filename = (
            "comprovante_orcamento.pdf" if version == 1 else f"comprovante_orcamento_v{version}.pdf"
        )
        attachments = [(filename, pdf_bytes, "application/pdf")]

        send_email(
            to=to_email,
            subject=(
                "Orçamento Aprovado - Aliança Traduções"
                if version == 1
                else f"Orçamento Aprovado (versão {version}) - Aliança Traduções"
            ),
            html_body=html_body,
            attachments=attachments,
            inline_images=get_inline_logo(),
        )
