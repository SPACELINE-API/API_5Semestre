import io
import uuid
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.contacts.models.contact import Contact
from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.request import Request
from app.modules.quotes.models.translation_item import QuoteTranslationItem
from app.modules.quotes.services.storage import upload_quote_document
from app.modules.seed.seed_requests import SEED_REQUESTS
from app.shared.database import get_session_factory

SEED_ASSETS_DIR = Path(__file__).resolve().parents[3] / "rest-client" / "seed-assets"


@dataclass(frozen=True)
class SeedQuote:
    id: uuid.UUID
    item_id: uuid.UUID
    request_id: uuid.UUID
    company_name: str
    source_language: str
    target_language: str
    document_type: str
    estimated_value: Decimal
    status: str
    asset_filename: str


SEED_QUOTES = [
    SeedQuote(
        id=uuid.UUID("3fa85f64-5717-4562-b3fc-2c963f66afa6"),
        item_id=uuid.UUID("72dc6f7e-cf14-44c3-972a-c2cd0a64fbeb"),
        request_id=uuid.UUID("a1000000-0000-4000-8000-000000000001"),
        company_name="Rezende Advogados",
        source_language="pt-BR",
        target_language="en-US",
        document_type="Contrato societário",
        estimated_value=Decimal("1240.00"),
        status="pending",
        asset_filename="contrato-societario.pdf",
    ),
    SeedQuote(
        id=uuid.UUID("7c9e6679-7425-40de-944b-e07fc1f90ae7"),
        item_id=uuid.UUID("27f0ca93-5b48-4474-a14f-2e43a4b660d6"),
        request_id=uuid.UUID("a1000000-0000-4000-8000-000000000002"),
        company_name="Horizonte Engenharia",
        source_language="es-ES",
        target_language="pt-BR",
        document_type="Certidão de nascimento",
        estimated_value=Decimal("380.00"),
        status="pending",
        asset_filename="certidao-de-nascimento.pdf",
    ),
    SeedQuote(
        id=uuid.UUID("e4eaaaf2-d142-11e1-b3e4-080027620cdd"),
        item_id=uuid.UUID("f9b2f74e-07d4-4221-bf4c-876dd37f808b"),
        request_id=uuid.UUID("a1000000-0000-4000-8000-000000000003"),
        company_name="Nexus Tech",
        source_language="en-US",
        target_language="pt-BR",
        document_type="Termo de confidencialidade",
        estimated_value=Decimal("610.00"),
        status="pending",
        asset_filename="termo-de-confidencialidade.pdf",
    ),
]


def seed_quotes(*, db: Session | None = None) -> list[str]:
    database_session = db or get_session_factory()()
    should_close_session = db is None

    try:
        seeded_ids = []
        request_ids = {seed_request.id for seed_request in SEED_REQUESTS}

        for seed_quote in SEED_QUOTES:
            if seed_quote.request_id not in request_ids:
                raise ValueError(f"Solicitação ausente no seed do orçamento {seed_quote.id}")

            request = database_session.get(Request, seed_quote.request_id)
            company = (
                database_session.query(Company)
                .filter(Company.trade_name == seed_quote.company_name)
                .first()
            )
            if request is None or company is None or request.company_id != company.id:
                raise ValueError(
                    f"Solicitação/empresa inválida no seed do orçamento {seed_quote.id}"
                )

            contact = database_session.get(Contact, request.contact_id)
            if contact is None or contact.company_id != company.id:
                raise ValueError(f"Contato inválido no seed do orçamento {seed_quote.id}")

            asset_path = SEED_ASSETS_DIR / seed_quote.asset_filename

            quote = database_session.get(Quote, seed_quote.id)
            if quote is None:
                quote = Quote(id=seed_quote.id)
                database_session.add(quote)

            quote.request_id = request.id
            quote.company_id = company.id
            quote.contact_id = contact.id
            quote.status = seed_quote.status
            quote.approved_at = None
            quote.approved_by = None
            quote.approved_by_email = None
            quote.reproved_at = None
            quote.reproved_by = None
            quote.reproved_by_email = None
            quote.reproval_reason = None
            quote.customer_name = contact.name
            quote.enterprise = company.trade_name
            quote.email = contact.email
            quote.original_language = request.original_language
            quote.translation_language = request.translation_language
            quote.customer_need = request.customer_need

            item = database_session.get(QuoteTranslationItem, seed_quote.item_id)
            if item is None:
                item = QuoteTranslationItem(id=seed_quote.item_id, quote_id=quote.id)
                database_session.add(item)
            item.quote_id = quote.id
            item.source_language = seed_quote.source_language
            item.target_language = seed_quote.target_language
            item.document_type = seed_quote.document_type
            item.estimated_value = seed_quote.estimated_value
            if asset_path.is_file():
                with asset_path.open("rb") as asset_file:
                    item.file_url = upload_quote_document(
                        asset_path.name,
                        io.BytesIO(asset_file.read()),
                        "application/pdf",
                        storage_path=f"seed/{seed_quote.id}/{asset_path.name}",
                    )
            elif (
                item.file_url
                and "/service-order-files/" in item.file_url
                and item.file_url.endswith(f"_{seed_quote.asset_filename}")
            ):
                # Remove the database reference to files created by the old fake-PDF seed.
                item.file_url = None
            seeded_ids.append(str(seed_quote.id))

        database_session.commit()

        return seeded_ids
    finally:
        if should_close_session:
            database_session.close()
