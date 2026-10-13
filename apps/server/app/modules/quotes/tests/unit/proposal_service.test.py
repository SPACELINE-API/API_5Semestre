from datetime import date
from unittest.mock import MagicMock

from app.modules.quotes.services.quote_service import QuoteService


def _make_quote(status: str = "pending"):
    q = MagicMock()
    q.status = status
    return q


def test_list_proposals_returns_paginated_dict(mock_db_session):
    quotes = [_make_quote(), _make_quote()]
    mock_db_session.refresh.side_effect = lambda obj: None
    service = QuoteService(mock_db_session)
    service.quote_repository.list_proposals = MagicMock(return_value=(quotes, 2))

    result = service.list_proposals(page=1, page_size=10)

    assert result["total"] == 2
    assert result["page"] == 1
    assert result["page_size"] == 10
    assert result["total_pages"] == 1
    assert result["items"] == quotes


def test_list_proposals_passes_date_range_to_repository(mock_db_session):
    service = QuoteService(mock_db_session)
    service.quote_repository.list_proposals = MagicMock(return_value=([], 0))

    start = date(2026, 1, 1)
    end = date(2026, 12, 31)
    service.list_proposals(page=1, page_size=10, start_date=start, end_date=end)

    service.quote_repository.list_proposals.assert_called_once_with(
        page=1,
        page_size=10,
        start_date=start,
        end_date=end,
        status=None,
    )


def test_list_proposals_passes_status_filter_to_repository(mock_db_session):
    service = QuoteService(mock_db_session)
    service.quote_repository.list_proposals = MagicMock(return_value=([], 0))

    service.list_proposals(page=1, page_size=10, status_filter="approved")

    service.quote_repository.list_proposals.assert_called_once_with(
        page=1,
        page_size=10,
        start_date=None,
        end_date=None,
        status="approved",
    )


def test_list_proposals_computes_total_pages_correctly(mock_db_session):
    service = QuoteService(mock_db_session)
    service.quote_repository.list_proposals = MagicMock(return_value=([], 25))

    result = service.list_proposals(page=1, page_size=10)

    assert result["total_pages"] == 3


def test_list_proposals_returns_empty_when_no_results(mock_db_session):
    service = QuoteService(mock_db_session)
    service.quote_repository.list_proposals = MagicMock(return_value=([], 0))

    result = service.list_proposals(page=1, page_size=10)

    assert result["items"] == []
    assert result["total"] == 0
    assert result["total_pages"] == 0
