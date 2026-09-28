from unittest.mock import MagicMock

from app.modules.quotes.schemas.request import RequestCreate
from app.modules.quotes.services.request_service import RequestService


def test_create_request_success():
    mock_db_session = MagicMock()
    mock_db_session.refresh.side_effect = lambda obj: None

    service = RequestService(mock_db_session)
    service.repo.get_last_by_email = MagicMock(return_value=None)

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
    assert result.document is None
    mock_db_session.add.assert_called_once()
    mock_db_session.commit.assert_called_once()
    mock_db_session.refresh.assert_called_once()


def test_create_request_with_document_success():
    mock_db_session = MagicMock()
    mock_db_session.refresh.side_effect = lambda obj: None

    service = RequestService(mock_db_session)
    service.repo.get_last_by_email = MagicMock(return_value=None)

    data = RequestCreate(
        customer_name="Maria Souza",
        enterprise="Empresa Y",
        email="maria@teste.com",
        original_language="Português",
        translation_language="Inglês",
        customer_need="Diploma",
        document=b"conteudo binario do arquivo",
    )

    result = service.create(data)

    assert result is not None
    assert result.document == b"conteudo binario do arquivo"
    mock_db_session.add.assert_called_once()
    mock_db_session.commit.assert_called_once()
