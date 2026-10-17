import uuid
from datetime import UTC, date, datetime

import pytest
from fastapi import HTTPException

from app.modules.proposals.services.proposal_service import ProposalService
from app.modules.quotes.models.quote import Quote


def test_build_translation_service_formatted():
    quote = Quote(
        original_language="Português",
        translation_language="Inglês",
    )
    result = ProposalService._build_translation_service(quote)
    assert result == "Português → Inglês"


def test_build_translation_service_missing_languages():
    quote = Quote(original_language=None, translation_language="Inglês")
    assert ProposalService._build_translation_service(quote) is None

    quote2 = Quote(original_language="Português", translation_language=None)
    assert ProposalService._build_translation_service(quote2) is None


def test_to_item_formats_dict_correctly():
    quote_id = uuid.uuid4()
    now = datetime.now(UTC)
    quote = Quote(
        id=quote_id,
        customer_name="Empresa ABC",
        enterprise="ABC Ltda",
        original_language="Espanhol",
        translation_language="Português",
        status="approved",
        created_at=now,
    )
    item = ProposalService._to_item(quote)
    assert item["id"] == quote_id
    assert item["customer_name"] == "Empresa ABC"
    assert item["enterprise"] == "ABC Ltda"
    assert item["translation_service"] == "Espanhol → Português"
    assert item["status"] == "approved"
    assert item["created_at"] == now


def test_list_proposals_rejects_inverted_dates(mock_db_session):
    service = ProposalService(mock_db_session)
    with pytest.raises(HTTPException) as exc_info:
        service.list_proposals(
            page=1,
            page_size=10,
            start_date=date(2025, 12, 31),
            end_date=date(2025, 1, 1),
        )
    assert exc_info.value.status_code == 422
    assert "start_date" in exc_info.value.detail


def test_list_proposals_rejects_invalid_sort_field(mock_db_session):
    service = ProposalService(mock_db_session)
    with pytest.raises(HTTPException) as exc_info:
        service.list_proposals(
            page=1,
            page_size=10,
            order_by="invalid_column",
        )
    assert exc_info.value.status_code == 422
    assert "Campo de ordenação 'invalid_column' inválido" in exc_info.value.detail


def test_list_proposals_rejects_invalid_sort_direction(mock_db_session):
    service = ProposalService(mock_db_session)
    with pytest.raises(HTTPException) as exc_info:
        service.list_proposals(
            page=1,
            page_size=10,
            order_dir="sideways",
        )
    assert exc_info.value.status_code == 422
    assert "order_dir deve ser 'asc' ou 'desc'" in exc_info.value.detail


def test_list_proposals_returns_empty_when_no_quotes(mock_db_session):
    service = ProposalService(mock_db_session)
    mock_db_session.scalar.return_value = 0
    mock_db_session.scalars.return_value = []

    result = service.list_proposals(page=1, page_size=10)

    assert result["total"] == 0
    assert result["items"] == []
    assert result["page"] == 1
    assert result["page_size"] == 10
