import smtplib
from collections.abc import Sequence
from email.message import EmailMessage

from app.shared.EnvProvider import env_provider


def send_email(
    to: str,
    subject: str,
    html_body: str,
    attachments: Sequence[tuple[str, bytes, str]] = (),
) -> None:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = env_provider.get_smtp_from_email()
    message["To"] = to
    message.set_content(html_body, subtype="html")
    for filename, content, content_type in attachments:
        maintype, _, subtype = content_type.partition("/")
        if not maintype or not subtype:
            maintype, subtype = "application", "octet-stream"
        message.add_attachment(
            content,
            maintype=maintype,
            subtype=subtype,
            filename=filename,
        )

    with smtplib.SMTP(env_provider.get_smtp_host(), env_provider.get_smtp_port()) as smtp:
        smtp_user = env_provider.get_smtp_user()
        if smtp_user:
            smtp.starttls()
            smtp.login(smtp_user, env_provider.get_smtp_password())

        smtp.send_message(message)
