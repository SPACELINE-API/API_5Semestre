import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime

from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.contacts.models.contact import Contact
from app.modules.quotes.models.request import Request, StatusEnum
from app.shared.database import get_session_factory


@dataclass(frozen=True)
class SeedRequest:
    id: uuid.UUID
    contact_id: uuid.UUID
    company_name: str
    original_language: str
    translation_language: str
    customer_need: str
    request_date: date


SEED_REQUESTS = [
    SeedRequest(
        id=uuid.UUID("a1000000-0000-4000-8000-000000000001"),
        contact_id=uuid.UUID("c1000000-0000-4000-8000-000000000001"),
        company_name="Rezende Advogados",
        original_language="pt-BR",
        translation_language="en-US",
        customer_need="Tradução de contrato societário",
        request_date=date(2026, 9, 22),
    ),
    SeedRequest(
        id=uuid.UUID("a1000000-0000-4000-8000-000000000002"),
        contact_id=uuid.UUID("c1000000-0000-4000-8000-000000000002"),
        company_name="Horizonte Engenharia",
        original_language="es-ES",
        translation_language="pt-BR",
        customer_need="Tradução de certidão de nascimento",
        request_date=date(2026, 9, 23),
    ),
    SeedRequest(
        id=uuid.UUID("a1000000-0000-4000-8000-000000000003"),
        contact_id=uuid.UUID("c1000000-0000-4000-8000-000000000003"),
        company_name="Nexus Tech",
        original_language="en-US",
        translation_language="pt-BR",
        customer_need="Tradução de termo de confidencialidade",
        request_date=date(2026, 9, 24),
    ),
]


def seed_requests(*, db: Session | None = None) -> list[str]:
    database_session = db or get_session_factory()()
    should_close_session = db is None

    try:
        seeded_ids = []
        for seed_request in SEED_REQUESTS:
            company = (
                database_session.query(Company)
                .filter(Company.trade_name == seed_request.company_name)
                .first()
            )
            contact = database_session.get(Contact, seed_request.contact_id)
            if company is None or contact is None or contact.company_id != company.id:
                raise ValueError(
                    f"Empresa/contato inválido no seed da solicitação {seed_request.id}"
                )

            request = database_session.get(Request, seed_request.id)
            if request is None:
                request = Request(id=seed_request.id)
                database_session.add(request)

            request.company_id = company.id
            request.contact_id = contact.id
            request.customer_name = contact.name
            request.enterprise = company.trade_name
            request.email = contact.email
            request.original_language = seed_request.original_language
            request.translation_language = seed_request.translation_language
            request.customer_need = seed_request.customer_need
            request.status = StatusEnum.APPROVED
            request.request_date = seed_request.request_date
            request.approved_at = datetime(
                seed_request.request_date.year,
                seed_request.request_date.month,
                seed_request.request_date.day,
                12,
                tzinfo=UTC,
            )
            request.reproved_at = None
            request.reproval_reason = None
            seeded_ids.append(str(request.id))

        database_session.commit()
        return seeded_ids
    finally:
        if should_close_session:
            database_session.close()
