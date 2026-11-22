from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.modules.quotes.services.storage import upload_receipt_pdf


@patch("app.modules.quotes.services.storage.get_supabase_config")
@patch("app.modules.quotes.services.storage.create_supabase_headers")
@patch("app.modules.quotes.services.storage.create_supabase_http_client")
def test_upload_receipt_pdf_success(mock_create_client, mock_create_headers, mock_get_config):
    mock_config = MagicMock()
    mock_config.url = "http://localhost:8000"
    mock_config.service_role_key = "test-key"
    mock_get_config.return_value = mock_config

    mock_headers = {"apikey": "test-key", "Authorization": "Bearer test-key"}
    mock_create_headers.return_value = mock_headers

    mock_response = MagicMock()
    mock_response.status_code = 201
    mock_client = MagicMock()
    mock_client.post.return_value = mock_response
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_create_client.return_value = mock_client

    file_data = BytesIO(b"test pdf content")

    result = upload_receipt_pdf("test.pdf", file_data, "application/pdf")

    assert result.startswith(
        "http://localhost:8000/storage/v1/object/public/quotes-documents/receipts/"
    )
    mock_client.post.assert_called_once()


@patch("app.modules.quotes.services.storage.get_supabase_config")
@patch("app.modules.quotes.services.storage.create_supabase_headers")
@patch("app.modules.quotes.services.storage.create_supabase_http_client")
def test_upload_receipt_pdf_failure(mock_create_client, mock_create_headers, mock_get_config):
    mock_config = MagicMock()
    mock_config.url = "http://localhost:8000"
    mock_config.service_role_key = "test-key"
    mock_get_config.return_value = mock_config

    mock_headers = {"apikey": "test-key", "Authorization": "Bearer test-key"}
    mock_create_headers.return_value = mock_headers

    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"
    mock_client = MagicMock()
    mock_client.post.return_value = mock_response
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_create_client.return_value = mock_client

    file_data = BytesIO(b"test pdf content")

    with pytest.raises(HTTPException) as exc:
        upload_receipt_pdf("test.pdf", file_data, "application/pdf")

    assert exc.value.status_code == 500
