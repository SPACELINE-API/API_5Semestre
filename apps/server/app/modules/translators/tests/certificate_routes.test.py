import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.system_parameters.models.language import Language
from app.modules.translators.models.translator import Translator
from app.modules.translators.models.translator_language import (
    ProficiencyLevel,
    TranslatorLanguage,
)
from app.modules.translators.routes import (
    profile_permission,
    translators_read_permission,
    translators_write_permission,
)
from app.modules.translators.services import storage
from app.shared.database import get_db

PDF = b"%PDF-1.7\n" + b"0" * 64 + b"\n%%EOF\n"


@pytest.fixture
def translator(isolated_db_session):
    isolated_db_session.add_all(
        [Language(id="pt-BR", name="Português"), Language(id="es", name="Espanhol")]
    )
    isolated_db_session.flush()
    item = Translator(
        name="Tradutora Rotas",
        email=f"{uuid.uuid4().hex[:10]}@translators.com",
        phone="(11) 98765-4321",
    )
    item.languages = [
        TranslatorLanguage(language_id="pt-BR", proficiency_level=ProficiencyLevel.NATIVE)
    ]
    isolated_db_session.add(item)
    isolated_db_session.commit()
    return item


@pytest.fixture
def authenticated(isolated_db_session, translator, monkeypatch):
    monkeypatch.setattr(storage, "upload_object", lambda *args: None)
    monkeypatch.setattr(storage, "delete_object", lambda *args: None)
    user = SupabaseAuthenticatedUser(id=str(uuid.uuid4()), email=translator.email)
    admin = SupabaseAuthenticatedUser(id=str(uuid.uuid4()), email="admin@example.com")
    app.dependency_overrides[get_db] = lambda: isolated_db_session
    app.dependency_overrides[profile_permission] = lambda: user
    app.dependency_overrides[translators_read_permission] = lambda: admin
    app.dependency_overrides[translators_write_permission] = lambda: admin
    yield
    for dependency in (
        get_db,
        profile_permission,
        translators_read_permission,
        translators_write_permission,
    ):
        app.dependency_overrides.pop(dependency, None)


def send_certificate(client: TestClient, content: bytes = PDF, content_type="application/pdf"):
    return client.post(
        "/api/translators/me/certificates",
        data={"language_id": "es", "proficiency_level": "advanced"},
        files={"file": ("certificado.pdf", content, content_type)},
    )


def test_translator_sends_certificate_and_receives_only_metadata(
    client: TestClient, authenticated, translator
):
    response = send_certificate(client)

    assert response.status_code == 201
    payload = response.json()
    assert payload["translator_id"] == str(translator.id)
    assert payload["language_name"] == "Espanhol"
    assert payload["status"] == "pending"
    assert payload["filename"] == "certificado.pdf"
    assert "storage_path" not in payload
    assert "checksum_sha256" not in payload


def test_invalid_certificate_returns_reason(client: TestClient, authenticated):
    response = send_certificate(client, b"texto qualquer", "text/plain")

    assert response.status_code == 422
    assert "PDF, JPG ou PNG" in response.json()["detail"]


def test_translator_lists_sent_certificates(client: TestClient, authenticated):
    send_certificate(client)

    response = client.get("/api/translators/me/certificates")

    assert response.status_code == 200
    assert [item["language_id"] for item in response.json()] == ["es"]


def test_admin_reviews_certificate_and_language_joins_profile(
    client: TestClient, authenticated, translator
):
    certificate_id = send_certificate(client).json()["id"]

    response = client.patch(
        f"/api/translators/{translator.id}/certificates/{certificate_id}/review",
        json={"status": "approved"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    profile = client.get("/api/translators/me").json()
    assert {item["language_id"] for item in profile["languages"]} == {"pt-BR", "es"}


def test_rejection_without_reason_is_invalid(client: TestClient, authenticated, translator):
    certificate_id = send_certificate(client).json()["id"]

    response = client.patch(
        f"/api/translators/{translator.id}/certificates/{certificate_id}/review",
        json={"status": "rejected", "review_note": "  "},
    )

    assert response.status_code == 422


def test_certificate_routes_require_authentication(client: TestClient):
    response = client.get("/api/translators/me/certificates")

    assert response.status_code == 401
