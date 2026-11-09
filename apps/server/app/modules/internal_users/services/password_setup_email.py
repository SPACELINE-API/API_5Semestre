from html import escape
from pathlib import Path

from app.modules.quotes.services.receipt_email import LOGO_CONTENT_ID, LOGO_PATH
from app.shared.email.smtp_client import send_email

TEMPLATE_PATH = (
    Path(__file__).resolve().parents[3] / "shared" / "email" / "templates" / "password_setup.html"
)
SUBJECT = "Defina sua senha - Aliança Traduções"


def render_password_setup_email(name: str, link: str, validity_days: int) -> str:
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    return (
        template.replace("{{name}}", escape(name))
        .replace("{{link}}", escape(link, quote=True))
        .replace("{{validity_days}}", str(validity_days))
    )


def send_password_setup_email(to: str, name: str, link: str, validity_days: int) -> None:
    inline_images = []
    if LOGO_PATH.exists():
        inline_images.append((LOGO_CONTENT_ID, LOGO_PATH.read_bytes(), "image/png"))

    send_email(
        to=to,
        subject=SUBJECT,
        html_body=render_password_setup_email(name, link, validity_days),
        inline_images=inline_images,
    )
