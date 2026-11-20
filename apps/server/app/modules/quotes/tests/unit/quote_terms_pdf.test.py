import io
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from pypdf import PdfReader

from app.modules.quotes.models import Quote, QuoteTranslationItem
from app.modules.quotes.services.quote_terms_pdf import (
    QuoteTermsPDFGenerator,
    format_valid_until,
    terms_filename,
)

QUOTE_ID = uuid.UUID("abcdef12-0000-0000-0000-000000000000")


def make_quote(**overrides) -> Quote:
    quote = Quote(
        id=QUOTE_ID,
        status="pending",
        enterprise="Empresa <Teste>",
        validity_starts_at=datetime(2026, 11, 10, 15, 0, tzinfo=UTC),
        **overrides,
    )
    quote.items = [
        QuoteTranslationItem(
            source_language="pt-BR",
            target_language="en-US",
            document_type="Contrato",
            estimated_value=Decimal("350.00"),
        )
    ]
    quote.additional_services = []
    return quote


def pdf_text(pdf: bytes) -> str:
    return "\n".join(page.extract_text() for page in PdfReader(io.BytesIO(pdf)).pages)


def test_terms_pdf_identifies_the_quote():
    quote = make_quote()

    text = pdf_text(QuoteTermsPDFGenerator().generate(quote))

    assert "TERMOS E CONDIÇÕES" in text
    assert "#ABCDEF12" in text
    assert f"Válido até {format_valid_until(quote.valid_until)}" in text
    assert "Empresa <Teste>" in text
    assert "R$ 350,00" in text


def test_terms_pdf_lists_every_section_of_the_terms():
    text = pdf_text(QuoteTermsPDFGenerator().generate(make_quote()))

    for section in (
        "Informações importantes",
        "Informações de pagamento",
        "Condições da proposta",
        "Oferecemos também",
    ):
        assert section in text
    assert "valor mínimo será de R$ 100,00" in text
    assert "PIX: CNPJ 04.205.581/0001-59" in text
    assert "cobraremos 20% do valor" in text
    assert "declara que leu e" in text


def test_terms_pdf_fills_validity_in_proposal_conditions():
    quote = make_quote()

    text = pdf_text(QuoteTermsPDFGenerator().generate(quote)).replace("\n", " ")

    assert f"terão validade até {format_valid_until(quote.valid_until)}" in text


def test_terms_pdf_works_without_logo():
    pdf = QuoteTermsPDFGenerator(logo_path=None).generate(make_quote())

    assert pdf.startswith(b"%PDF")


def test_terms_filename_uses_short_quote_code():
    assert terms_filename(make_quote()) == "termos_orcamento_ABCDEF12.pdf"


def test_format_valid_until_uses_sao_paulo_date():
    assert format_valid_until(datetime(2026, 12, 10, 1, 0, tzinfo=UTC)) == "09/12/2026"
    assert format_valid_until(None) == "-"
