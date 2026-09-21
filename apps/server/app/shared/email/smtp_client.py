import smtplib
from email.message import EmailMessage

from app.shared.EnvProvider import env_provider


def send_email(to: str, subject: str, html_body: str) -> None:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = env_provider.get_smtp_from_email()
    message["To"] = to
    message.set_content(html_body, subtype="html")

    with smtplib.SMTP(env_provider.get_smtp_host(), env_provider.get_smtp_port()) as smtp:
        smtp_user = env_provider.get_smtp_user()
        if smtp_user:
            smtp.starttls()
            smtp.login(smtp_user, env_provider.get_smtp_password())

        smtp.send_message(message)
