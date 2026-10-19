from datetime import UTC, datetime

from app.modules.service_orders.services.invite_email import (
    DEADLINE_PENDING,
    DEFAULT_INVITE_BODY_HTML,
    DEFAULT_INVITE_SUBJECT,
    NOT_INFORMED,
    InviteEmailData,
    format_deadline,
    render_invite_email,
)


def make_data(**overrides) -> InviteEmailData:
    values = {
        "translator_name": "Maria Souza",
        "source_language": "pt-BR",
        "target_language": "en-US",
        "document_type": "Contrato",
        "deadline": datetime(2026, 11, 5, tzinfo=UTC),
        "invite_url": "https://app.example.com/convites/abc",
    }
    values.update(overrides)
    return InviteEmailData(**values)


def test_default_template_fills_every_placeholder() -> None:
    subject, body = render_invite_email(
        DEFAULT_INVITE_SUBJECT, DEFAULT_INVITE_BODY_HTML, make_data()
    )

    assert subject == DEFAULT_INVITE_SUBJECT
    assert "{{" not in body
    assert "Maria Souza" in body
    assert "pt-BR → en-US" in body
    assert "Contrato" in body
    assert "05/11/2026" in body
    assert 'href="https://app.example.com/convites/abc"' in body


def test_subject_placeholders_are_replaced_without_escaping() -> None:
    subject, _ = render_invite_email(
        "Convite para {{nome_tradutor}}", "<p>x</p>", make_data(translator_name="Zé & Cia")
    )

    assert subject == "Convite para Zé & Cia"


def test_body_values_are_html_escaped() -> None:
    _, body = render_invite_email(
        "s", "<p>{{nome_tradutor}}</p>", make_data(translator_name="<script>x</script>")
    )

    assert "<script>" not in body
    assert "&lt;script&gt;" in body


def test_missing_document_type_and_deadline_use_readable_fallbacks() -> None:
    _, body = render_invite_email(
        "s",
        "{{tipo_documento}}|{{prazo}}",
        make_data(document_type=None, deadline=None),
    )

    assert body == f"{NOT_INFORMED}|{DEADLINE_PENDING}"


def test_format_deadline() -> None:
    assert format_deadline(datetime(2026, 1, 9, tzinfo=UTC)) == "09/01/2026"
    assert format_deadline(None) == DEADLINE_PENDING
