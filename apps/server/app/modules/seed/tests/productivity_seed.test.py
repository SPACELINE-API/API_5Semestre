from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from app.modules.reports.services.productivity_service import ProductivityService
from app.modules.seed.seed_productivity import (
    COMPLETED_ITEMS,
    SEED_ORDER_IDS,
    SEED_PRODUCTIVITY_TRANSLATORS,
    clear_productivity_seed,
    seed_productivity,
)
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_file import ServiceOrderFile
from app.modules.service_orders.models.service_order_item import (
    STATUS_CONCLUIDA,
    ServiceOrderItem,
)


@pytest.fixture
def db_session(isolated_db_session):
    return isolated_db_session


def seeded_items(db_session: Session) -> list[ServiceOrderItem]:
    return (
        db_session.query(ServiceOrderItem)
        .filter(ServiceOrderItem.service_order_id.in_(SEED_ORDER_IDS))
        .all()
    )


def test_seed_creates_completed_and_in_progress_items(db_session: Session) -> None:
    seed_productivity(db=db_session)

    items = seeded_items(db_session)
    completed = [item for item in items if item.status == STATUS_CONCLUIDA]

    assert len(completed) == COMPLETED_ITEMS
    assert len(items) > len(completed)
    assert all(item.completed_at is not None for item in completed)
    assert all(item.translator_id is not None for item in items)


def test_seed_is_idempotent(db_session: Session) -> None:
    seed_productivity(db=db_session)
    seed_productivity(db=db_session)

    assert len(seeded_items(db_session)) == COMPLETED_ITEMS + 3
    assert db_session.query(ServiceOrder).count() == len(SEED_ORDER_IDS)


def test_seed_registers_every_productivity_translator(db_session: Session) -> None:
    seed_productivity(db=db_session)

    used = {item.translator_id for item in seeded_items(db_session)}

    assert used <= {translator_id for translator_id, *_ in SEED_PRODUCTIVITY_TRANSLATORS}
    assert len(used) >= 4


def test_seed_attaches_delivered_files_with_references(db_session: Session) -> None:
    seed_productivity(db=db_session)

    completed = [item for item in seeded_items(db_session) if item.status == STATUS_CONCLUIDA]
    files = db_session.query(ServiceOrderFile).all()

    assert len(files) == len(completed)
    assert all(file.service_order_item_id is not None for file in files)
    assert all(file.file_url.startswith("https://") for file in files)


def test_report_has_data_with_on_time_and_late_documents(db_session: Session) -> None:
    seed_productivity(db=db_session)
    today = datetime.now(UTC).date()

    report = ProductivityService(db_session).get_report(today - timedelta(days=60), today)

    assert report.summary.documents_translated == COMPLETED_ITEMS
    assert report.summary.on_time_documents > 0
    assert report.summary.late_documents > 0
    assert len(report.translators) >= 4
    assert report.summary.projects_count == len(SEED_ORDER_IDS)


def test_default_period_shows_documents_for_the_charts(db_session: Session) -> None:
    seed_productivity(db=db_session)

    report = ProductivityService(db_session).get_report()

    assert report.summary.documents_translated > 0
    assert len(report.translators) > 1


def test_clear_removes_only_the_productivity_data(db_session: Session) -> None:
    seed_productivity(db=db_session)

    clear_productivity_seed(db=db_session)

    assert seeded_items(db_session) == []
    assert db_session.query(ServiceOrder).count() == 0
