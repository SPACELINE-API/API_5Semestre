import uuid
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.modules.quotes.schemas.translation_item import (
    QuoteTranslationItemCreate,
    QuoteTranslationItemUpdate,
)
from app.modules.quotes.services.translation_item_service import TranslationItemService


def test_create_item_persists_document_type_file_url_and_price(mock_db_session):
    quote = MagicMock()
    mock_db_session.query.return_value.filter.return_value.first.return_value = quote
    mock_db_session.refresh.side_effect = lambda obj: None
    service = TranslationItemService(mock_db_session)

    item = service.create_item(
        uuid.uuid4(),
        QuoteTranslationItemCreate(
            source_language="pt-BR",
            target_language="en-US",
            document_type="Contrato social",
            file_url="https://storage.test/file.pdf",
            estimated_value=250,
        ),
    )

    assert item.document_type == "Contrato social"
    assert item.file_url == "https://storage.test/file.pdf"
    assert item.estimated_value == 250


def test_update_item_can_change_languages(mock_db_session):
    item = MagicMock()
    mock_db_session.query.return_value.filter.return_value.first.return_value = item
    service = TranslationItemService(mock_db_session)

    service.update_item(
        uuid.uuid4(),
        uuid.uuid4(),
        QuoteTranslationItemUpdate(source_language="es-ES", target_language="pt-BR"),
    )

    assert item.source_language == "es-ES"
    assert item.target_language == "pt-BR"


def test_delete_item_removes_it(mock_db_session):
    item = MagicMock()
    mock_db_session.query.return_value.filter.return_value.first.return_value = item
    service = TranslationItemService(mock_db_session)

    service.delete_item(uuid.uuid4(), uuid.uuid4())

    mock_db_session.delete.assert_called_once_with(item)
    mock_db_session.commit.assert_called_once()


def test_delete_item_not_found_raises_404(mock_db_session):
    mock_db_session.query.return_value.filter.return_value.first.return_value = None
    service = TranslationItemService(mock_db_session)

    with pytest.raises(HTTPException) as error:
        service.delete_item(uuid.uuid4(), uuid.uuid4())

    assert error.value.status_code == 404
