from app.modules.quotes.schemas.quote import QuoteCreate
from app.modules.quotes.services.quote_service import QuoteService


def test_create_quote_success(mock_db_session):
    service = QuoteService(mock_db_session)
    quote_data = QuoteCreate(status="draft")

    mock_db_session.refresh.side_effect = lambda obj: None

    result = service.create_quote(quote_data)

    assert result is not None
    assert result.status == "draft"
    mock_db_session.add.assert_called_once()
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once()
