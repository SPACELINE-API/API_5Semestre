import uuid
from decimal import Decimal

from app.modules.quotes.models import AdditionalService, Quote, QuoteTranslationItem
from app.modules.quotes.services.quote_sent_email import render_quote_sent_email


def make_quote() -> Quote:
    quote = Quote(id=uuid.uuid4(), status="pending", enterprise="Acme <b>Ltda</b>")
    quote.items = [
        QuoteTranslationItem(
            source_language="pt-BR",
            target_language="en-US",
            document_type="Contrato",
            estimated_value=Decimal("100.00"),
        )
    ]
    quote.additional_services = [
        AdditionalService(description="Revisão", price=Decimal("20.00"), status="pending")
    ]
    return quote


def render(is_update: bool = False):
    return render_quote_sent_email(
        make_quote(),
        customer_name="Maria",
        approval_url="https://app.test/aprovar-orcamento?token=abc",
        valid_until="10/12/2026",
        is_update=is_update,
    )


def test_email_lists_items_total_validity_and_link():
    title, html = render()

    assert "para aprovação" in title
    assert "Olá, Maria." in html
    assert "Contrato" in html
    assert "pt-BR → en-US" in html
    assert "Revisão" in html
    assert "R$ 120,00" in html
    assert "Válido até 10/12/2026" in html
    assert 'href="https://app.test/aprovar-orcamento?token=abc"' in html
    assert "{{" not in html


def test_resend_email_says_the_quote_was_updated():
    title, html = render(is_update=True)

    assert "atualizado" in title
    assert "O link enviado anteriormente não vale mais." in html


def test_email_escapes_customer_data():
    _title, html = render()

    assert "<b>Ltda</b>" not in html
    assert "&lt;b&gt;Ltda&lt;/b&gt;" in html
