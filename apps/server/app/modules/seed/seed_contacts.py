import uuid
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.contacts.models.contact import Contact
from app.shared.database import get_session_factory


@dataclass(frozen=True)
class SeedContact:
    id: uuid.UUID
    company_name: str
    name: str
    email: str
    phone: str
    department: str


SEED_CONTACTS = [
    SeedContact(
        id=uuid.UUID("c1000000-0000-4000-8000-000000000001"),
        company_name="Rezende Advogados",
        name="Fernanda Aquino",
        email="fernanda.aquino@rezendeadv.com.br",
        phone="(11) 98765-4321",
        department="Jurídico",
    ),
    SeedContact(
        id=uuid.UUID("c1000000-0000-4000-8000-000000000002"),
        company_name="Horizonte Engenharia",
        name="Rafael Costa",
        email="rafael.costa@horizonteengenharia.com.br",
        phone="(41) 98765-4321",
        department="Projetos",
    ),
    SeedContact(
        id=uuid.UUID("c1000000-0000-4000-8000-000000000003"),
        company_name="Nexus Tech",
        name="Luiza Mendes",
        email="luiza.mendes@nexustech.com.br",
        phone="(61) 98765-4321",
        department="Compliance",
    ),
]


def seed_contacts(*, db: Session | None = None) -> list[str]:
    database_session = db or get_session_factory()()
    should_close_session = db is None

    try:
        seeded_ids = []
        for seed_contact in SEED_CONTACTS:
            company = (
                database_session.query(Company)
                .filter(Company.trade_name == seed_contact.company_name)
                .first()
            )
            if company is None:
                raise ValueError(f"Empresa do seed não encontrada: {seed_contact.company_name}")

            contact = database_session.get(Contact, seed_contact.id)
            if contact is None:
                contact = (
                    database_session.query(Contact)
                    .filter(Contact.email == seed_contact.email)
                    .first()
                )
            if contact is None:
                contact = Contact(id=seed_contact.id)
                database_session.add(contact)

            contact.company_id = company.id
            contact.name = seed_contact.name
            contact.email = seed_contact.email
            contact.phone = seed_contact.phone
            contact.department = seed_contact.department
            seeded_ids.append(str(contact.id))

        database_session.commit()
        return seeded_ids
    finally:
        if should_close_session:
            database_session.close()
