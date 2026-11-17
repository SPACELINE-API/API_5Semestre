import io

import pytest
from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas

from app.main import app
from app.modules.quotes import routes as quote_routes
from app.modules.quotes.routes import documents_write_permission

UPLOADED_URL = "https://storage.test/quotes-documents/arquivo.pdf"


@pytest.fixture
def uploads(monkeypatch) -> list[dict]:
    calls: list[dict] = []

    def fake_upload(filename: str, file_data, content_type: str) -> str:
        calls.append(
            {"filename": filename, "content": file_data.read(), "content_type": content_type}
        )
        return UPLOADED_URL

    monkeypatch.setattr(quote_routes, "upload_quote_document", fake_upload)
    app.dependency_overrides[documents_write_permission] = lambda: None
    yield calls
    app.dependency_overrides.pop(documents_write_permission, None)


def make_pdf(text: str) -> bytes:
    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer)
    pdf.drawString(72, 720, text)
    pdf.showPage()
    pdf.save()
    return buffer.getvalue()


def test_upload_returns_file_url_and_word_count(client: TestClient, uploads: list[dict]) -> None:
    content = make_pdf("Contrato de compra e venda")

    response = client.post(
        "/api/quotes/upload-document",
        files={"file": ("contrato.pdf", content, "application/pdf")},
    )

    assert response.status_code == 201
    assert response.json() == {"file_url": UPLOADED_URL, "word_count": 5}
    assert uploads == [
        {"filename": "contrato.pdf", "content": content, "content_type": "application/pdf"}
    ]


def test_upload_returns_null_word_count_when_file_cannot_be_read(
    client: TestClient, uploads: list[dict]
) -> None:
    response = client.post(
        "/api/quotes/upload-document",
        files={"file": ("foto.png", b"\x89PNG\r\n\x1a\n", "image/png")},
    )

    assert response.status_code == 201
    assert response.json() == {"file_url": UPLOADED_URL, "word_count": None}
    assert len(uploads) == 1
