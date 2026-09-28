import uuid
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.modules.translators.models.translator import Translator
from app.shared.database import get_session_factory


@dataclass(frozen=True)
class SeedTranslator:
    id: uuid.UUID
    name: str
    email: str
    phone: str


SEED_TRANSLATORS = [
    SeedTranslator(
        id=uuid.UUID("a1a2a3a4-0000-4000-8000-000000000001"),
        name="Operador Tradutor",
        email="operador@spaceline.com.br",
        phone="11988887777",
    ),
    SeedTranslator(
        id=uuid.UUID("a1a2a3a4-0000-4000-8000-000000000002"),
        name="Camila Tradutora",
        email="camila.tradutora@spaceline.com.br",
        phone="11977776666",
    ),
]


def seed_translators(*, db: Session | None = None) -> list[str]:
    database_session = db or get_session_factory()()
    should_close_session = db is None

    try:
        database_session.query(Translator).delete()
        seeded_emails = []

        for seed_translator in SEED_TRANSLATORS:
            database_session.add(
                Translator(
                    id=seed_translator.id,
                    name=seed_translator.name,
                    email=seed_translator.email,
                    phone=seed_translator.phone,
                )
            )
            seeded_emails.append(seed_translator.email)

        database_session.commit()

        return seeded_emails
    finally:
        if should_close_session:
            database_session.close()
