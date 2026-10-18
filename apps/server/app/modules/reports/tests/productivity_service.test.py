import random
import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.clients.schemas.company import calculate_cnpj_check_digit
from app.modules.quotes.models.quote import Quote
from app.modules.reports.services.productivity_service import (
    DEFAULT_PERIOD_DAYS,
    ProductivityService,
    resolve_period,
)
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_file import (
    DIRECTION_ENTRADA,
    DIRECTION_SAIDA,
    ServiceOrderFile,
)
from app.modules.service_orders.models.service_order_item import (
    STATUS_CONCLUIDA,
    STATUS_EM_ANALISE,
    ServiceOrderItem,
)
from app.modules.translators.models.translator import Translator

_FIRST_DV_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
_SECOND_DV_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]


def generate_valid_cnpj() -> str:
    base = "".join(str(random.randint(0, 9)) for _ in range(12))
    first_dv = calculate_cnpj_check_digit(base, _FIRST_DV_WEIGHTS)
    second_dv = calculate_cnpj_check_digit(base + first_dv, _SECOND_DV_WEIGHTS)
    return base + first_dv + second_dv


def at(day: int, hour: int = 12) -> datetime:
    return datetime(2026, 3, day, hour, tzinfo=UTC)


@pytest.fixture
def db_session(isolated_db_session):
    return isolated_db_session


def make_translator(db_session: Session, name: str = "Tradutora Teste") -> Translator:
    translator = Translator(
        name=name,
        email=f"{uuid.uuid4().hex[:10]}@translators.com",
        phone="11987654321",
    )
    db_session.add(translator)
    db_session.commit()
    return translator


def make_service_order(db_session: Session, project_name: str = "Projeto") -> ServiceOrder:
    company = Company(
        legal_name="Acme Tecnologia Ltda",
        trade_name="Acme Tech",
        cnpj=generate_valid_cnpj(),
        industry="juridico",
        phone="11987654321",
        email=f"{uuid.uuid4().hex[:10]}@acmetech.com",
        zip_code="01310-100",
        street="Avenida Paulista",
        number="1000",
        neighborhood="Bela Vista",
        city="Sao Paulo",
        state="SP",
    )
    db_session.add(company)
    quote = Quote(status="approved")
    db_session.add(quote)
    db_session.commit()

    service_order = ServiceOrder(
        quote_id=quote.id, company_id=company.id, project_name=project_name
    )
    db_session.add(service_order)
    db_session.commit()
    return service_order


def add_item(
    db_session: Session,
    service_order: ServiceOrder,
    translator: Translator | None,
    completed_at: datetime | None,
    status: str = STATUS_CONCLUIDA,
    word_count: int | None = 100,
    price: str | None = "50.00",
    deadline: datetime | None = None,
    created_at: datetime | None = None,
) -> ServiceOrderItem:
    item = ServiceOrderItem(
        service_order_id=service_order.id,
        source_language="pt-BR",
        target_language="en-US",
        document_type="Contrato",
        status=status,
        translator_id=translator.id if translator else None,
        word_count=word_count,
        price=Decimal(price) if price else None,
        deadline=deadline,
        completed_at=completed_at,
        created_at=created_at or at(1),
    )
    db_session.add(item)
    db_session.commit()
    return item


def test_resolve_period_defaults_to_the_last_thirty_days() -> None:
    start, end = resolve_period(None, None, today=date(2026, 3, 31))

    assert end == date(2026, 3, 31)
    assert start == date(2026, 3, 31) - timedelta(days=DEFAULT_PERIOD_DAYS)


def test_resolve_period_rejects_start_after_end() -> None:
    with pytest.raises(HTTPException) as error:
        resolve_period(date(2026, 3, 10), date(2026, 3, 1))

    assert error.value.status_code == 422


def test_report_counts_only_documents_completed_inside_the_period(db_session: Session) -> None:
    translator = make_translator(db_session)
    order = make_service_order(db_session)
    add_item(db_session, order, translator, at(5))
    add_item(db_session, order, translator, at(10, hour=23))
    add_item(db_session, order, translator, at(1))
    add_item(db_session, order, translator, at(20))

    report = ProductivityService(db_session).get_report(date(2026, 3, 5), date(2026, 3, 10))

    assert report.summary.documents_translated == 2
    assert report.translators[0].documents_translated == 2


def test_report_ignores_items_that_are_not_completed_or_have_no_translator(
    db_session: Session,
) -> None:
    translator = make_translator(db_session)
    order = make_service_order(db_session)
    add_item(db_session, order, translator, None, status=STATUS_EM_ANALISE)
    add_item(db_session, order, None, at(5))
    add_item(db_session, order, translator, at(5))

    report = ProductivityService(db_session).get_report(date(2026, 3, 1), date(2026, 3, 31))

    assert report.summary.documents_translated == 1
    assert len(report.translators) == 1


def test_report_filtered_by_translator_only_considers_that_translator(
    db_session: Session,
) -> None:
    maria = make_translator(db_session, "Maria")
    joao = make_translator(db_session, "João")
    order = make_service_order(db_session)
    add_item(db_session, order, maria, at(5))
    add_item(db_session, order, joao, at(6))
    add_item(db_session, order, joao, at(7))

    report = ProductivityService(db_session).get_report(
        date(2026, 3, 1), date(2026, 3, 31), translator_id=joao.id
    )

    assert report.summary.documents_translated == 2
    assert [row.translator_id for row in report.translators] == [joao.id]


def test_report_filtered_by_project_respects_the_filter(db_session: Session) -> None:
    translator = make_translator(db_session)
    first_order = make_service_order(db_session, "Projeto A")
    second_order = make_service_order(db_session, "Projeto B")
    add_item(db_session, first_order, translator, at(5))
    add_item(db_session, second_order, translator, at(6))
    add_item(db_session, second_order, translator, at(7))

    report = ProductivityService(db_session).get_report(
        date(2026, 3, 1), date(2026, 3, 31), service_order_id=second_order.id
    )

    assert report.summary.documents_translated == 2
    assert report.summary.projects_count == 1


def test_report_orders_translators_by_volume(db_session: Session) -> None:
    maria = make_translator(db_session, "Maria")
    joao = make_translator(db_session, "João")
    order = make_service_order(db_session)
    add_item(db_session, order, maria, at(5))
    add_item(db_session, order, joao, at(6))
    add_item(db_session, order, joao, at(7))

    report = ProductivityService(db_session).get_report(date(2026, 3, 1), date(2026, 3, 31))

    assert [row.translator_name for row in report.translators] == ["João", "Maria"]


def test_indicators_are_calculated_from_the_completed_documents(db_session: Session) -> None:
    translator = make_translator(db_session)
    first_order = make_service_order(db_session, "Projeto A")
    second_order = make_service_order(db_session, "Projeto B")
    add_item(
        db_session,
        first_order,
        translator,
        completed_at=at(5),
        word_count=300,
        price="100.50",
        deadline=at(6),
        created_at=at(1),
    )
    add_item(
        db_session,
        second_order,
        translator,
        completed_at=at(9),
        word_count=200,
        price="49.50",
        deadline=at(8),
        created_at=at(5),
    )
    add_item(
        db_session,
        second_order,
        translator,
        completed_at=at(9),
        word_count=None,
        price=None,
        deadline=None,
        created_at=at(7),
    )

    summary = (
        ProductivityService(db_session).get_report(date(2026, 3, 1), date(2026, 3, 31)).summary
    )

    assert summary.documents_translated == 3
    assert summary.total_words == 500
    assert summary.total_value == Decimal("150.00")
    assert summary.projects_count == 2
    assert summary.on_time_documents == 1
    assert summary.late_documents == 1
    assert summary.on_time_rate == 0.5
    assert summary.average_turnaround_days == pytest.approx((4 + 4 + 2) / 3, abs=0.01)


def test_indicators_are_empty_when_nothing_was_translated(db_session: Session) -> None:
    make_translator(db_session)

    report = ProductivityService(db_session).get_report(date(2026, 3, 1), date(2026, 3, 31))

    assert report.translators == []
    assert report.summary.documents_translated == 0
    assert report.summary.total_value == Decimal("0")
    assert report.summary.on_time_rate is None
    assert report.summary.average_turnaround_days is None


def test_report_rejects_unknown_translator_and_project(db_session: Session) -> None:
    service = ProductivityService(db_session)

    with pytest.raises(HTTPException) as translator_error:
        service.get_report(translator_id=uuid.uuid4())
    with pytest.raises(HTTPException) as project_error:
        service.get_report(service_order_id=uuid.uuid4())

    assert translator_error.value.status_code == 404
    assert project_error.value.status_code == 404


def test_details_list_documents_with_storage_references_and_metadata(
    db_session: Session,
) -> None:
    translator = make_translator(db_session)
    other_translator = make_translator(db_session)
    order = make_service_order(db_session, "Projeto A")
    mine = add_item(db_session, order, translator, at(5), deadline=at(6))
    other = add_item(db_session, order, other_translator, at(5))
    mine.file_url = "https://storage.example/original.pdf"
    db_session.add_all(
        [
            ServiceOrderFile(
                service_order_id=order.id,
                service_order_item_id=mine.id,
                filename="traducao.pdf",
                file_url="https://storage.example/traducao.pdf",
                direction=DIRECTION_SAIDA,
            ),
            ServiceOrderFile(
                service_order_id=order.id,
                service_order_item_id=other.id,
                filename="outra.pdf",
                file_url="https://storage.example/outra.pdf",
                direction=DIRECTION_SAIDA,
            ),
            ServiceOrderFile(
                service_order_id=order.id,
                service_order_item_id=mine.id,
                filename="entrada.pdf",
                file_url="https://storage.example/entrada.pdf",
                direction=DIRECTION_ENTRADA,
            ),
        ]
    )
    db_session.commit()

    details = ProductivityService(db_session).get_translator_details(
        translator.id, date(2026, 3, 1), date(2026, 3, 31)
    )

    assert details.translator_id == translator.id
    assert details.documents_translated == 1
    assert len(details.documents) == 1
    document = details.documents[0]
    assert document.item_id == mine.id
    assert document.project_name == "Projeto A"
    assert document.on_time is True
    assert document.original_file_url == "https://storage.example/original.pdf"
    assert [file.filename for file in document.delivered_files] == ["traducao.pdf"]
    assert document.delivered_files[0].file_url == "https://storage.example/traducao.pdf"


def test_details_respect_the_period_and_project_filters(db_session: Session) -> None:
    translator = make_translator(db_session)
    first_order = make_service_order(db_session, "Projeto A")
    second_order = make_service_order(db_session, "Projeto B")
    add_item(db_session, first_order, translator, at(5))
    add_item(db_session, second_order, translator, at(6))
    add_item(db_session, second_order, translator, at(25))

    details = ProductivityService(db_session).get_translator_details(
        translator.id,
        date(2026, 3, 1),
        date(2026, 3, 10),
        service_order_id=second_order.id,
    )

    assert [document.project_name for document in details.documents] == ["Projeto B"]


def test_details_reject_unknown_translator(db_session: Session) -> None:
    with pytest.raises(HTTPException) as error:
        ProductivityService(db_session).get_translator_details(uuid.uuid4())

    assert error.value.status_code == 404


def test_filters_list_translators_and_projects(db_session: Session) -> None:
    make_translator(db_session, "Zélia")
    make_translator(db_session, "Ana")
    make_service_order(db_session, "Projeto Z")
    make_service_order(db_session, "Projeto A")

    filters = ProductivityService(db_session).get_filters()

    assert [translator.name for translator in filters.translators] == ["Ana", "Zélia"]
    assert [project.project_name for project in filters.projects] == ["Projeto A", "Projeto Z"]
