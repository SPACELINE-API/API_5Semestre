import uuid
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.modules.translators.models.language_pair import LanguagePair
from app.shared.database import get_session_factory


@dataclass(frozen=True)
class SeedLanguagePair:
    id: uuid.UUID
    source_language: str
    target_language: str


# PARES DE IDIOMA PRE-CADASTRADOS NO SISTEMA PARA USO NOS TRADUTORES
SEED_LANGUAGE_PAIRS = [
    SeedLanguagePair(
        id=uuid.UUID("b1b2b3b4-0000-4000-8000-000000000001"),
        source_language="pt-BR",
        target_language="en-US",
    ),
    SeedLanguagePair(
        id=uuid.UUID("b1b2b3b4-0000-4000-8000-000000000002"),
        source_language="en-US",
        target_language="pt-BR",
    ),
    SeedLanguagePair(
        id=uuid.UUID("b1b2b3b4-0000-4000-8000-000000000003"),
        source_language="pt-BR",
        target_language="es-ES",
    ),
    SeedLanguagePair(
        id=uuid.UUID("b1b2b3b4-0000-4000-8000-000000000004"),
        source_language="es-ES",
        target_language="pt-BR",
    ),
    SeedLanguagePair(
        id=uuid.UUID("b1b2b3b4-0000-4000-8000-000000000005"),
        source_language="pt-BR",
        target_language="fr-FR",
    ),
    SeedLanguagePair(
        id=uuid.UUID("b1b2b3b4-0000-4000-8000-000000000006"),
        source_language="pt-BR",
        target_language="de-DE",
    ),
    SeedLanguagePair(
        id=uuid.UUID("b1b2b3b4-0000-4000-8000-000000000007"),
        source_language="en-US",
        target_language="es-ES",
    ),
    SeedLanguagePair(
        id=uuid.UUID("b1b2b3b4-0000-4000-8000-000000000008"),
        source_language="pt-BR",
        target_language="ja-JP",
    ),
]


def seed_language_pairs(*, db: Session | None = None) -> list[uuid.UUID]:
    database_session = db or get_session_factory()()
    should_close_session = db is None

    try:
        # INSERE APENAS OS PARES QUE AINDA NAO EXISTEM NO BANCO
        existing_ids = {row.id for row in database_session.query(LanguagePair.id).all()}
        seeded_ids = []

        for pair in SEED_LANGUAGE_PAIRS:
            if pair.id not in existing_ids:
                database_session.add(
                    LanguagePair(
                        id=pair.id,
                        source_language=pair.source_language,
                        target_language=pair.target_language,
                    )
                )
            seeded_ids.append(pair.id)

        database_session.commit()
        return seeded_ids
    finally:
        if should_close_session:
            database_session.close()
