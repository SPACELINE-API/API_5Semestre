import uuid
from datetime import UTC, datetime
from unittest.mock import MagicMock

from app.modules.quote_receipts.models.quote_receipt import QuoteReceipt
from app.modules.quote_receipts.repositories.quote_receipt_repository import QuoteReceiptRepository


def test_get_by_id_returns_receipt(mock_db_session):
    receipt_id = uuid.uuid4()
    receipt = QuoteReceipt(
        id=receipt_id,
        quote_id=uuid.uuid4(),
        company_id=uuid.uuid4(),
        status="available",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    mock_db_session.get.return_value = receipt

    repository = QuoteReceiptRepository(mock_db_session)
    result = repository.get_by_id(receipt_id)

    assert result == receipt
    mock_db_session.get.assert_called_once_with(QuoteReceipt, receipt_id)


def test_get_by_id_returns_none_when_not_found(mock_db_session):
    receipt_id = uuid.uuid4()
    mock_db_session.get.return_value = None

    repository = QuoteReceiptRepository(mock_db_session)
    result = repository.get_by_id(receipt_id)

    assert result is None
    mock_db_session.get.assert_called_once_with(QuoteReceipt, receipt_id)


def test_get_by_quote_id_returns_receipt(mock_db_session):
    quote_id = uuid.uuid4()
    receipt = QuoteReceipt(
        id=uuid.uuid4(),
        quote_id=quote_id,
        company_id=uuid.uuid4(),
        status="available",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    mock_query = MagicMock()
    mock_query.filter.return_value.first.return_value = receipt
    mock_db_session.query.return_value = mock_query

    repository = QuoteReceiptRepository(mock_db_session)
    result = repository.get_by_quote_id(quote_id)

    assert result == receipt
    mock_db_session.query.assert_called_once_with(QuoteReceipt)


def test_get_by_quote_id_returns_none_when_not_found(mock_db_session):
    quote_id = uuid.uuid4()
    mock_query = MagicMock()
    mock_query.filter.return_value.first.return_value = None
    mock_db_session.query.return_value = mock_query

    repository = QuoteReceiptRepository(mock_db_session)
    result = repository.get_by_quote_id(quote_id)

    assert result is None


def test_create_persists_receipt(mock_db_session):
    receipt = QuoteReceipt(
        id=uuid.uuid4(),
        quote_id=uuid.uuid4(),
        company_id=uuid.uuid4(),
        status="available",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    mock_db_session.refresh.side_effect = lambda obj: None

    repository = QuoteReceiptRepository(mock_db_session)
    result = repository.create(receipt)

    assert result == receipt
    mock_db_session.add.assert_called_once_with(receipt)
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once_with(receipt)


def test_update_persists_changes(mock_db_session):
    receipt = QuoteReceipt(
        id=uuid.uuid4(),
        quote_id=uuid.uuid4(),
        company_id=uuid.uuid4(),
        status="available",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    mock_db_session.refresh.side_effect = lambda obj: None

    repository = QuoteReceiptRepository(mock_db_session)
    result = repository.update(receipt)

    assert result == receipt
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once_with(receipt)
