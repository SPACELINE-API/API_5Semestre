import uuid
from contextlib import contextmanager
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.modules.translators.services import storage


class _Response:
    def __init__(self, status_code: int, payload: dict | None = None):
        self.status_code = status_code
        self.payload = payload or {}

    def json(self):
        return self.payload


class _Client:
    def __init__(self, response: _Response):
        self.response = response
        self.post_url = None
        self.post_json = None
        self.post_headers = None

    def post(self, url, headers, json=None, content=None):
        self.post_url = url
        self.post_json = json
        self.post_headers = headers
        return self.response


def _configure(monkeypatch, response: _Response) -> _Client:
    client = _Client(response)
    monkeypatch.setattr(
        storage,
        "get_supabase_config",
        lambda: SimpleNamespace(url="https://project.supabase.co", service_role_key="key"),
    )
    monkeypatch.setattr(storage, "create_supabase_headers", lambda key: {"apikey": key})

    @contextmanager
    def make_client():
        yield client

    monkeypatch.setattr(storage, "create_supabase_http_client", make_client)
    return client


def test_create_signed_url_returns_absolute_url_with_expiration(monkeypatch):
    client = _configure(
        monkeypatch,
        _Response(
            200,
            {"signedURL": "/object/sign/translator-certificates/t1/cert.pdf?token=abc"},
        ),
    )

    url = storage.create_signed_url(storage.CERTIFICATE_BUCKET, "t1/cert.pdf")

    assert url == (
        "https://project.supabase.co/storage/v1/object/sign/"
        "translator-certificates/t1/cert.pdf?token=abc"
    )
    assert client.post_url == (
        "https://project.supabase.co/storage/v1/object/sign/translator-certificates/t1/cert.pdf"
    )
    assert client.post_json == {"expiresIn": storage.SIGNED_URL_EXPIRES_IN}


@pytest.mark.parametrize("status_code", [400, 404])
def test_create_signed_url_reports_missing_file(monkeypatch, status_code):
    _configure(monkeypatch, _Response(status_code))

    with pytest.raises(HTTPException) as error:
        storage.create_signed_url(storage.CERTIFICATE_BUCKET, "t1/cert.pdf")

    assert error.value.status_code == 404


def test_create_signed_url_reports_storage_failure(monkeypatch):
    _configure(monkeypatch, _Response(500))

    with pytest.raises(HTTPException) as error:
        storage.create_signed_url(storage.CERTIFICATE_BUCKET, "t1/cert.pdf")

    assert error.value.status_code == 502


def test_build_certificate_path_uses_language_folder_and_original_name():
    path = storage.build_certificate_path(
        uuid.UUID("a1a2a3a4-0000-4000-8000-000000000001"), "es-ES", "Certificação DELE.pdf"
    )

    assert path == "a1a2a3a4-0000-4000-8000-000000000001/es-ES/Certificacao_DELE.pdf"


@pytest.mark.parametrize(("upsert", "expected"), [(False, None), (True, "true")])
def test_upload_object_sends_upsert_only_when_overwriting(monkeypatch, upsert, expected):
    client = _configure(monkeypatch, _Response(200))

    storage.upload_object(
        storage.CERTIFICATE_BUCKET, "t1/es-ES/cert.pdf", b"%PDF", "application/pdf", upsert=upsert
    )

    assert client.post_url.endswith("/storage/v1/object/translator-certificates/t1/es-ES/cert.pdf")
    assert client.post_headers.get("x-upsert") == expected
