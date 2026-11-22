from datetime import UTC, date, datetime, timedelta

import pytest

from app.modules.quotes.models.request import Request, StatusEnum
from app.modules.quotes.repositories.request_repository import RequestRepository


@pytest.fixture
def db_session(isolated_db_session):
    return isolated_db_session


def make_request(db_session, name: str, request_date: date, created_at: datetime) -> Request:
    request = Request(
        customer_name=name,
        enterprise="Empresa X",
        email=f"{name.lower()}@teste.com",
        original_language="pt-BR",
        translation_language="en-US",
        customer_need="Contrato",
        status=StatusEnum.PENDING,
        request_date=request_date,
        created_at=created_at,
    )
    db_session.add(request)
    db_session.flush()
    return request


def test_list_all_returns_newest_requests_first(db_session):
    now = datetime.now(UTC)
    today = date.today()
    old = make_request(db_session, "Antiga", today - timedelta(days=5), now - timedelta(days=5))
    first_today = make_request(db_session, "Primeira", today, now - timedelta(hours=3))
    last_today = make_request(db_session, "Ultima", today, now - timedelta(hours=1))

    ids = [request.id for request in RequestRepository(db_session).list_all()]

    assert ids.index(last_today.id) < ids.index(first_today.id) < ids.index(old.id)
