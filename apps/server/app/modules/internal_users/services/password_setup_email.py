from pathlib import Path

from app.shared.email.smtp_client import send_email
from app.shared.email.template_renderer import (
    get_inline_logo,
    render_password_setup,
)
from app.shared.email.template_renderer import (
    LOGO_CONTENT_ID,
    LOGO_PATH,
    get_inline_logo,
    render_password_setup,
)

TEMPLATE_PATH = (
    Path(__file__).resolve().parents[3] / "shared" / "email" / "templates" / "password_setup.html"
)
SUBJECT = "Defina sua senha - Aliança Traduções"


def render_password_setup_email(name: str, link: str, validity_days: int) -> str:
    return render_password_setup(name=name, link=link, validity_days=validity_days)


def send_password_setup_email(to: str, name: str, link: str, validity_days: int) -> None:
    send_email(
        to=to,
        subject=SUBJECT,
        html_body=render_password_setup_email(name, link, validity_days),
        inline_images=get_inline_logo(),
    )
