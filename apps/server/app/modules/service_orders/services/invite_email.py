import html
from dataclasses import dataclass
from datetime import datetime

DEFAULT_INVITE_SUBJECT = "Novo serviço de tradução disponível"
DEFAULT_INVITE_BODY_HTML = (
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

NOT_INFORMED = "Não informado"
DEADLINE_PENDING = "A definir"


@dataclass(frozen=True)
class InviteEmailData:
    translator_name: str
    source_language: str
    target_language: str
    document_type: str | None
    deadline: datetime | None
    invite_url: str


def format_deadline(deadline: datetime | None) -> str:
    return deadline.strftime("%d/%m/%Y") if deadline else DEADLINE_PENDING


def _replace_placeholders(text: str, values: dict[str, str]) -> str:
    for name, value in values.items():
        text = text.replace("{{" + name + "}}", value)
    return text


def render_invite_email(
    subject_template: str, body_template: str, data: InviteEmailData
) -> tuple[str, str]:
    plain_values = {
        "nome_tradutor": data.translator_name,
        "idioma_origem": data.source_language,
        "idioma_destino": data.target_language,
        "tipo_documento": data.document_type or NOT_INFORMED,
        "prazo": format_deadline(data.deadline),
        "link_convite": data.invite_url,
    }
    escaped_values = {name: html.escape(value, quote=True) for name, value in plain_values.items()}

    return (
        _replace_placeholders(subject_template, plain_values),
        _replace_placeholders(body_template, escaped_values),
    )
