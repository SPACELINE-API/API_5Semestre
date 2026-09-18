from unittest.mock import MagicMock

from app.modules.quotes.schemas.request import RequestCreate
from app.modules.quotes.services.request_service import RequestService


def test_create_request_success():
    mock_db_session = MagicMock()
    mock_db_session.refresh.side_effect = lambda obj: None

    service = RequestService(mock_db_session)
    data = RequestCreate(
        customer_name="João Silva",
        enterprise="Padilhas Company",
        email="joao@teste.com",
        original_language="Português",
        translation_language="Francês",
        customer_need="Contrato Social",
    )

    result = service.create(data)

    assert result is not None
    assert result.customer_name == "João Silva"
    mock_db_session.add.assert_called_once()
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once()
