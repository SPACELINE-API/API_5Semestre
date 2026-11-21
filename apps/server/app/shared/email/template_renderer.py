import html
from functools import lru_cache
from pathlib import Path

TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
ASSETS_DIR = Path(__file__).resolve().parent / "assets"

SHARED_LOGO_PATH = ASSETS_DIR / "logo-alianca.png"
LEGACY_LOGO_PATH = (
    Path(__file__).resolve().parents[2]
    / "modules"
    / "quotes"
    / "assets"
    / "receipt-logo-alianca.png"
)

LOGO_PATH = SHARED_LOGO_PATH if SHARED_LOGO_PATH.exists() else LEGACY_LOGO_PATH
LOGO_CONTENT_ID = "logo-alianca"


def get_inline_logo() -> list[tuple[str, bytes, str]]:
    if LOGO_PATH.exists():
        return [(LOGO_CONTENT_ID, LOGO_PATH.read_bytes(), "image/png")]
    return []


@lru_cache(maxsize=16)
def _read_template_file(filename: str) -> str:
    path = TEMPLATES_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Template de email não encontrado: {path}")
    return path.read_text(encoding="utf-8")


def replace_placeholders(template: str, values: dict[str, str]) -> str:
    result = template
    for key, value in values.items():
        result = result.replace("{{" + key + "}}", value)
    return result


def wrap_with_base_layout(content_html: str, email_title: str = "Aliança Traduções") -> str:
    """Wraps body content in base_layout.html if it's not already a full HTML document."""
    if "<!doctype html" in content_html.lower() or "<html" in content_html.lower():
        return content_html

    base_template = _read_template_file("base_layout.html")
    return replace_placeholders(
        base_template,
        {
            "email_title": html.escape(email_title),
            "email_content": content_html,
        },
    )


def render_quote_approved(
    quote_code: str,
    total_value_formatted: str,
    approval_date: str,
    template_path: str | None = None,
) -> str:
    if template_path:
        path = Path(template_path)
        if not path.exists():
            raise FileNotFoundError(f"Template não encontrado: {template_path}")
        template = path.read_text(encoding="utf-8")
    else:
        template = _read_template_file("quote_approved.html")

    replacements = {
        "quote_code": html.escape(quote_code),
        "total_value": total_value_formatted,
        "approval_date": html.escape(approval_date),
    }
    return replace_placeholders(template, replacements)


def render_password_setup(name: str, link: str, validity_days: int) -> str:
    template = _read_template_file("password_setup.html")
    replacements = {
        "name": html.escape(name),
        "link": html.escape(link, quote=True),
        "validity_days": str(validity_days),
    }
    return replace_placeholders(template, replacements)


def render_translator_invite(
    translator_name: str,
    source_language: str,
    target_language: str,
    document_type: str | None,
    deadline_str: str,
    invite_url: str,
    subject_template: str | None = None,
    body_template: str | None = None,
) -> tuple[str, str]:
    default_subject = "Novo serviço de tradução disponível - Aliança Traduções"
    subject = subject_template or default_subject

    plain_values = {
        "nome_tradutor": translator_name,
        "idioma_origem": source_language,
        "idioma_destino": target_language,
        "tipo_documento": document_type or "Não informado",
        "prazo": deadline_str,
        "link_convite": invite_url,
    }

    escaped_values = {key: html.escape(val, quote=True) for key, val in plain_values.items()}

    final_subject = replace_placeholders(subject, plain_values)

    if body_template:
        rendered_body = replace_placeholders(body_template, escaped_values)
        final_body = wrap_with_base_layout(rendered_body, email_title=final_subject)
    else:
        template = _read_template_file("translator_invite.html")
        final_body = replace_placeholders(template, escaped_values)

    return final_subject, final_body


def render_document_delivery(
    customer_name: str,
    subject_template: str | None = None,
    body_template: str | None = None,
) -> tuple[str, str]:
    default_subject = "Tradução concluída - Aliança Traduções"
    subject = subject_template or default_subject

    plain_values = {"nome_cliente": customer_name}
    escaped_values = {"nome_cliente": html.escape(customer_name, quote=True)}

    final_subject = replace_placeholders(subject, plain_values)

    if body_template:
        rendered_body = replace_placeholders(body_template, escaped_values)
        final_body = wrap_with_base_layout(rendered_body, email_title=final_subject)
    else:
        template = _read_template_file("translated_document_delivery.html")
        final_body = replace_placeholders(template, escaped_values)

    return final_subject, final_body
