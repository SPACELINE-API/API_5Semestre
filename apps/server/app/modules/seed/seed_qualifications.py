import uuid
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.modules.translators.models.qualification import TechnicalQualification
from app.shared.database import get_session_factory


@dataclass(frozen=True)
class SeedQualification:
    id: uuid.UUID
    name: str
    description: str | None


# QUALIFICACOES TECNICAS PRE-CADASTRADAS NO SISTEMA
SEED_QUALIFICATIONS = [
    SeedQualification(
        id=uuid.UUID("c1c2c3c4-0000-4000-8000-000000000001"),
        name="Tradução Jurídica",
        description="Contratos, peças processuais e documentos legais",
    ),
    SeedQualification(
        id=uuid.UUID("c1c2c3c4-0000-4000-8000-000000000002"),
        name="Tradução Técnica",
        description="Manuais, documentação de engenharia e especificações técnicas",
    ),
    SeedQualification(
        id=uuid.UUID("c1c2c3c4-0000-4000-8000-000000000003"),
        name="Tradução Médica",
        description="Bulas, prontuários, laudos e documentos clínicos",
    ),
    SeedQualification(
        id=uuid.UUID("c1c2c3c4-0000-4000-8000-000000000004"),
        name="Tradução Literária",
        description="Livros, contos, poesia e textos de ficção",
    ),
    SeedQualification(
        id=uuid.UUID("c1c2c3c4-0000-4000-8000-000000000005"),
        name="Tradução Financeira",
        description="Relatórios financeiros, balanços e documentos contábeis",
    ),
    SeedQualification(
        id=uuid.UUID("c1c2c3c4-0000-4000-8000-000000000006"),
        name="Tradução Acadêmica",
        description="Artigos científicos, dissertações e publicações acadêmicas",
    ),
]


def seed_qualifications(*, db: Session | None = None) -> list[uuid.UUID]:
    database_session = db or get_session_factory()()
    should_close_session = db is None

    try:
        # INSERE APENAS AS QUALIFICACOES QUE AINDA NAO EXISTEM NO BANCO
        existing_ids = {row.id for row in database_session.query(TechnicalQualification.id).all()}
        seeded_ids = []

        for qualification in SEED_QUALIFICATIONS:
            if qualification.id not in existing_ids:
                database_session.add(
                    TechnicalQualification(
                        id=qualification.id,
                        name=qualification.name,
                        description=qualification.description,
                    )
                )
            seeded_ids.append(qualification.id)

        database_session.commit()
        return seeded_ids
    finally:
        if should_close_session:
            database_session.close()
