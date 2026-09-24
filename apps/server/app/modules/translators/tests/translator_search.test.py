import uuid

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.modules.translators.models.language_pair import (
    LanguagePair,
    TranslatorLanguagePair,
)
from app.modules.translators.models.qualification import (
    TechnicalQualification,
    TranslatorQualification,
)
from app.modules.translators.models.translator import Translator
from app.modules.translators.schemas.translator import (
    LanguagePairInput,
    TranslatorCreate,
)
from app.modules.translators.services.translator_service import TranslatorService
from app.shared.database import Base, get_database_url


@pytest.fixture
def db_session():
    engine = create_engine(get_database_url())
    Base.metadata.create_all(bind=engine)

    connection = engine.connect()
    outer_transaction = connection.begin()
    session = sessionmaker(bind=connection)()
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session, transaction):
        if transaction.nested and not transaction._parent.nested:
            session.begin_nested()

    session.query(TranslatorLanguagePair).delete()
    session.query(TranslatorQualification).delete()
    session.query(Translator).delete()
    session.query(LanguagePair).delete()
    session.query(TechnicalQualification).delete()

    yield session

    session.close()
    if outer_transaction.is_active:
        outer_transaction.rollback()
    connection.close()


def make_language_pair(db_session: Session, source: str, target: str) -> LanguagePair:
    pair = LanguagePair(source_language=source, target_language=target)
    db_session.add(pair)
    db_session.commit()
    return pair


def make_qualification(db_session: Session, name: str) -> TechnicalQualification:
    qualification = TechnicalQualification(name=name)
    db_session.add(qualification)
    db_session.commit()
    return qualification


def make_translator(
    db_session: Session,
    qualification_ids: list[uuid.UUID] | None = None,
    language_pair_ids: list[uuid.UUID] | None = None,
    **overrides,
) -> Translator:
    # TranslatorCreate exige pelo menos 1 par de idioma; se nenhum for
    # informado, cria um par descartável só para satisfazer essa regra.
    if not language_pair_ids:
        default_pair = make_language_pair(db_session, "pt-BR", uuid.uuid4().hex[:8])
        language_pair_ids = [default_pair.id]

    unique_suffix = uuid.uuid4().hex[:10]
    data = {
        "name": "Joao Tradutor",
        "email": f"{unique_suffix}@spaceline.com.br",
        "phone": "11987654321",
        "qualification_ids": qualification_ids or [],
        "language_pairs": [
            LanguagePairInput(language_pair_id=pair_id, proficiency_level="fluent")
            for pair_id in language_pair_ids
        ],
    }
    data.update(overrides)
    service = TranslatorService(db_session)
    return service.create(TranslatorCreate(**data))


def test_search_translators_by_language_matches_source_or_target(
    db_session: Session,
) -> None:
    en_pt = make_language_pair(db_session, "en", "pt-BR")
    fr_es = make_language_pair(db_session, "fr", "es")
    translator_en = make_translator(db_session, language_pair_ids=[en_pt.id])
    make_translator(db_session, language_pair_ids=[fr_es.id])

    results, total = TranslatorService(db_session).search(language="en")

    assert total == 1
    assert [translator.id for translator in results] == [translator_en.id]


def test_search_translators_by_language_matches_target_language(
    db_session: Session,
) -> None:
    pt_en = make_language_pair(db_session, "pt-BR", "en")
    translator = make_translator(db_session, language_pair_ids=[pt_en.id])

    results, total = TranslatorService(db_session).search(language="en")

    assert total == 1
    assert [t.id for t in results] == [translator.id]


def test_search_translators_by_specialty(db_session: Session) -> None:
    legal = make_qualification(db_session, "Juridico")
    technical = make_qualification(db_session, "Tecnico")
    translator_legal = make_translator(db_session, qualification_ids=[legal.id])
    make_translator(db_session, qualification_ids=[technical.id])

    results, total = TranslatorService(db_session).search(specialty="jurid")

    assert total == 1
    assert [t.id for t in results] == [translator_legal.id]


def test_search_translators_by_status(db_session: Session) -> None:
    active = make_translator(db_session)
    inactive = make_translator(db_session)
    inactive.is_active = False
    db_session.commit()

    results, total = TranslatorService(db_session).search(status=True)

    assert total == 1
    assert [t.id for t in results] == [active.id]


def test_search_translators_combines_filters(db_session: Session) -> None:
    en_pt = make_language_pair(db_session, "en", "pt-BR")
    legal = make_qualification(db_session, "Juridico")
    match = make_translator(db_session, qualification_ids=[legal.id], language_pair_ids=[en_pt.id])
    make_translator(db_session, language_pair_ids=[en_pt.id])

    results, total = TranslatorService(db_session).search(language="en", specialty="jurid")

    assert total == 1
    assert [t.id for t in results] == [match.id]


def test_search_translators_with_multiple_matching_pairs_is_not_duplicated(
    db_session: Session,
) -> None:
    en_pt = make_language_pair(db_session, "en", "pt-BR")
    en_es = make_language_pair(db_session, "en", "es")
    translator = make_translator(db_session, language_pair_ids=[en_pt.id, en_es.id])

    results, total = TranslatorService(db_session).search(language="en")

    assert total == 1
    assert [t.id for t in results] == [translator.id]


def test_search_translators_without_filters_returns_all_paginated(
    db_session: Session,
) -> None:
    for _ in range(2):
        make_translator(db_session)

    results, total = TranslatorService(db_session).search()

    assert total == 2
    assert len(results) == 2


def test_search_translators_returns_empty_when_no_match(db_session: Session) -> None:
    make_translator(db_session)

    results, total = TranslatorService(db_session).search(language="zz")

    assert results == []
    assert total == 0


def test_search_translators_paginates_results(db_session: Session) -> None:
    for _ in range(5):
        make_translator(db_session)

    first_page, total = TranslatorService(db_session).search(page=1, page_size=2)
    second_page, _ = TranslatorService(db_session).search(page=2, page_size=2)

    assert total == 5
    assert len(first_page) == 2
    assert len(second_page) == 2
    assert {t.id for t in first_page}.isdisjoint({t.id for t in second_page})


def test_search_translators_page_beyond_results_returns_empty(db_session: Session) -> None:
    make_translator(db_session)

    results, total = TranslatorService(db_session).search(page=2, page_size=20)

    assert results == []
    assert total == 1
