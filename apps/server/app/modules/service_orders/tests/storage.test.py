from contextlib import contextmanager
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.modules.service_orders.services import storage
from app.modules.service_orders.services.service_order_service import ServiceOrderService


class _Response:
    def __init__(self, status_code: int):
        self.status_code = status_code
        self.text = "storage error"


class _Client:
    def __init__(self, response: _Response):
        self.response = response
        self.deleted_url = None
        self.deleted_method = None
        self.deleted_json = None
        self.head_url = None

    def head(self, url, headers):
        self.head_url = url
        self.head_headers = headers
        return self.response

    def request(self, method, url, headers, json):
        self.deleted_method = method
        self.deleted_url = url
        self.deleted_json = json
        return self.response


def _configure(monkeypatch, response):
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


def test_delete_service_order_file_removes_object_from_bucket(monkeypatch):
    client = _configure(monkeypatch, _Response(200))

    storage.delete_service_order_file(
        "https://project.supabase.co/storage/v1/object/public/service-order-files/folder/a%20b.pdf"
    )

    assert client.deleted_method == "DELETE"
    assert client.deleted_url == "https://project.supabase.co/storage/v1/object/service-order-files"
    assert client.deleted_json == {"prefixes": ["folder/a b.pdf"]}


def test_delete_service_order_file_leaves_external_urls_alone(monkeypatch):
    client = _configure(monkeypatch, _Response(200))

    storage.delete_service_order_file("https://example.com/customer-document.pdf")

    assert client.deleted_url is None


def test_delete_service_order_file_surfaces_storage_errors(monkeypatch):
    _configure(monkeypatch, _Response(500))

    with pytest.raises(HTTPException) as error:
        storage.delete_service_order_file(
            "https://project.supabase.co/storage/v1/object/public/service-order-files/a.pdf"
        )
    assert error.value.status_code == 502


def test_extract_service_order_storage_path_decodes_url():
    assert (
        storage.get_service_order_storage_path(
            "https://project.supabase.co/storage/v1/object/public/"
            "service-order-files/translated/final%20version.pdf"
        )
        == "translated/final version.pdf"
    )


def test_service_order_file_exists_checks_supabase_storage(monkeypatch):
    client = _configure(monkeypatch, _Response(200))

    assert storage.service_order_file_exists("translated/final version.pdf") is True

    assert (
        client.head_url == "https://project.supabase.co/storage/v1/object/"
        "service-order-files/translated/final%20version.pdf"
    )


def test_service_order_file_exists_returns_false_for_missing_object(monkeypatch):
    _configure(monkeypatch, _Response(404))

    assert storage.service_order_file_exists("missing.pdf") is False


class _Query:
    def __init__(self, result):
        self.result = result

    def filter(self, *_conditions):
        return self

    def first(self):
        return self.result


class _ReferenceSession:
    def __init__(self, results):
        self.results = iter(results)

    def query(self, _entity):
        return _Query(next(self.results))


@pytest.mark.parametrize(
    "results",
    [
        [object(), None, None],  # another service order item uses this object
        [None, object(), None],  # quote translation item still uses this object
        [None, None, object()],  # another uploaded service order file uses it
    ],
)
def test_shared_document_url_is_kept(results):
    service = ServiceOrderService(_ReferenceSession(results))

    assert service._is_file_url_referenced("https://storage.test/shared.pdf") is True


def test_unreferenced_document_url_can_be_deleted():
    service = ServiceOrderService(_ReferenceSession([None, None, None]))

    assert service._is_file_url_referenced("https://storage.test/orphan.pdf") is False
