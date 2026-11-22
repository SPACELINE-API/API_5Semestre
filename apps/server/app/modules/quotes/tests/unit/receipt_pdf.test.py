from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

import pytest

from app.modules.clients.models.company import Company
from app.modules.quotes.models.additional_service import AdditionalService
from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.translation_item import QuoteTranslationItem
from app.modules.quotes.services.receipt_pdf import ReceiptPDFGenerator


@pytest.fixture
def quote_with_items():
    company = Company(
        id=uuid4(),
        legal_name="Empresa Teste Ltda",
        trade_name="Empresa Teste",
        cnpj="12.345.678/0001-90",
        industry="Serviços",
        phone="11999999999",
        email="empresa@teste.com",
        zip_code="01000-000",
        street="Rua Teste",
        number="123",
        neighborhood="Centro",
        city="São Paulo",
        state="SP",
    )

    quote = Quote(
        id=uuid4(),
        company=company,
        company_id=company.id,
        status="approved",
        approved_at=datetime(2026, 11, 3, 10, 0, tzinfo=UTC),
        customer_name="João Silva",
        customer_need="Contrato Social",
    )

    item1 = QuoteTranslationItem(
        id=uuid4(),
        quote_id=quote.id,
        source_language="Português",
        target_language="Inglês",
        document_type="Contrato",
        estimated_value=Decimal("150.00"),
    )

    item2 = QuoteTranslationItem(
        id=uuid4(),
        quote_id=quote.id,
        source_language="Português",
        target_language="Espanhol",
        document_type="Diploma",
        estimated_value=Decimal("200.00"),
    )

    service = AdditionalService(
        id=uuid4(),
        quote_id=quote.id,
        description="Revisão",
        price=Decimal("50.00"),
    )

    quote.items = [item1, item2]
    quote.additional_services = [service]

    return quote


def test_pdf_generator_generates_pdf_bytes(quote_with_items):
    generator = ReceiptPDFGenerator(logo_path=None)

    pdf_bytes = generator.generate_receipt(quote_with_items)

    assert pdf_bytes is not None
    assert len(pdf_bytes) > 0
    assert pdf_bytes.startswith(b"%PDF")


def test_pdf_generator_with_nonexistent_logo(quote_with_items):
    generator = ReceiptPDFGenerator(logo_path="/nonexistent/path/logo.png")

    pdf_bytes = generator.generate_receipt(quote_with_items)

    assert pdf_bytes is not None
    assert len(pdf_bytes) > 0


def test_pdf_generator_without_items():
    company = Company(
        id=uuid4(),
        legal_name="Empresa Teste Ltda",
        trade_name="Empresa Teste",
        cnpj="12.345.678/0001-90",
        industry="Serviços",
        phone="11999999999",
        email="empresa@teste.com",
        zip_code="01000-000",
        street="Rua Teste",
        number="123",
        neighborhood="Centro",
        city="São Paulo",
        state="SP",
    )

    quote = Quote(
        id=uuid4(),
        company=company,
        company_id=company.id,
        status="approved",
        approved_at=datetime(2026, 11, 3, 10, 0, tzinfo=UTC),
        customer_name="João Silva",
        customer_need="Contrato Social",
    )

    generator = ReceiptPDFGenerator(logo_path=None)
    pdf_bytes = generator.generate_receipt(quote)

    assert pdf_bytes is not None
    assert len(pdf_bytes) > 0


def _flowable_text(flowables) -> str:
    texts = []
    for flowable in flowables:
        if hasattr(flowable, "_cellvalues"):
            for row in flowable._cellvalues:
                texts.extend(getattr(cell, "text", str(cell)) for cell in row)
        elif hasattr(flowable, "_content"):
            texts.append(_flowable_text(flowable._content))
        elif hasattr(flowable, "text"):
            texts.append(flowable.text)
    return " | ".join(texts)


def test_pdf_generator_includes_contact_service_order_and_language_names(quote_with_items):
    from app.modules.contacts.models.contact import Contact
    from app.modules.service_orders.models.service_order import ServiceOrder

    quote_with_items.contact = Contact(
        name="Maria Souza",
        department="Jurídico",
        email="maria@teste.com",
        phone="11988887777",
    )
    quote_with_items.approved_by_email = "atendente@aliancatraducoes.com.br"
    quote_with_items.items[0].source_language = "pt-BR"
    quote_with_items.items[0].target_language = "en-US"
    quote_with_items.service_orders = [
        ServiceOrder(
            id=uuid4(),
            project_name="Contrato social 2026",
            deadline=datetime(2026, 11, 20, 15, 0, tzinfo=UTC),
            external_notes="Entrega em PDF assinado.",
        )
    ]
    generator = ReceiptPDFGenerator()
    generator.language_names = {"pt-BR": "Português (Brasil)", "en-US": "Inglês (EUA)"}
    generator._build_styles()

    text = _flowable_text(
        generator._contact_section(quote_with_items)
        + generator._quote_section(quote_with_items, "ABCDEF12")
        + generator._items_section(quote_with_items)
        + generator._notes_section(quote_with_items)
        + generator._closing(quote_with_items, "ABCDEF12")
    )

    assert "Aprovado por:" in text
    assert "atendente@aliancatraducoes.com.br" in text
    assert "Maria Souza" in text
    assert "Jurídico" in text
    assert "Contrato social 2026" in text
    assert "20/11/2026 12:00" in text
    assert "Português (Brasil)" in text
    assert "Inglês (EUA)" in text
    assert "Entrega em PDF assinado." in text
    assert "registrada por atendente@aliancatraducoes.com.br" in text

    pdf_bytes = generator.generate_receipt(
        quote_with_items, language_names=generator.language_names
    )
    assert pdf_bytes.startswith(b"%PDF")


def test_pdf_generator_header_includes_issuer_data(quote_with_items):
    generator = ReceiptPDFGenerator()
    generator._build_styles()

    text = _flowable_text(generator._header(quote_with_items, "ABCDEF12"))

    assert "Aliança Traduções e Comunicações Ltda - EPP" in text
    assert "04.205.581/0001-59" in text
    assert "(11) 3384-8550" in text
    assert "Rua Pereira Estefano, 114" in text
