from decimal import Decimal
from pathlib import Path

from app.modules.quote_receipts.services.formatting import format_brl
from app.shared.email.smtp_client import send_email

DEFAULT_TEMPLATE_PATH = (
    Path(__file__).resolve().parents[3] / "shared" / "email" / "templates" / "quote_approved.html"
)
LOGO_PATH = Path(__file__).resolve().parent.parent / "assets" / "logo-alianca.png"
LOGO_CONTENT_ID = "logo-alianca"


class EmailService:
    def __init__(self, template_path: str | None = None):
        self.template_path = template_path or str(DEFAULT_TEMPLATE_PATH)

    def send_quote_approved_email(
        self,
        to_email: str,
        quote_code: str,
        total_value: Decimal,
        approval_date: str,
        pdf_bytes: bytes,
    ) -> None:
        template_file = Path(self.template_path)
        if not template_file.exists():
            raise FileNotFoundError(f"Template não encontrado: {self.template_path}")

        template_content = template_file.read_text(encoding="utf-8")

        html_body = template_content.replace("{{quote_code}}", quote_code)
        html_body = html_body.replace("{{total_value}}", format_brl(total_value))
        html_body = html_body.replace("{{approval_date}}", approval_date)

        attachments = [("comprovante_orcamento.pdf", pdf_bytes, "application/pdf")]

        inline_images = []
        if LOGO_PATH.exists():
            inline_images.append((LOGO_CONTENT_ID, LOGO_PATH.read_bytes(), "image/png"))

        send_email(
            to=to_email,
            subject="Orçamento Aprovado - Aliança Traduções",
            html_body=html_body,
            attachments=attachments,
            inline_images=inline_images,
        )
