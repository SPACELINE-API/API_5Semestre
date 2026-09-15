from pathlib import Path

from pact import Pact

PACT_DIR = Path(__file__).parents[4] / "pacts"

def test_create_translation_item_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create a valid translation item")
        .given("a quote exists")
        .with_request("POST", "/api/quotes/123e4567-e89b-12d3-a456-426614174000/translation-items")
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "source_language": "es-ES",
                "target_language": "en-US",
            }
        )
        .will_respond_with(201)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "id": "123e4567-e89b-12d3-a456-426614174001",
                "quote_id": "123e4567-e89b-12d3-a456-426614174000",
                "source_language": "es-ES",
                "target_language": "en-US",
                "created_at": "2026-09-13T10:00:00Z",
                "updated_at": "2026-09-13T10:00:00Z"
            }
        )
    )

    pact.write_file(PACT_DIR)


def test_create_translation_item_quote_not_found_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create an item for a non-existent quote")
        .given("the quote does not exist")
        .with_request("POST", "/api/quotes/999e4567-e89b-12d3-a456-426614174999/translation-items")
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "source_language": "es-ES",
                "target_language": "en-US",
            }
        )
        .will_respond_with(404)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "detail": "Quote not found",
            }
        )
    )

    pact.write_file(PACT_DIR)


def test_create_translation_item_missing_fields_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create a translation item with missing body")
        .given("the request is completely empty")
        .with_request("POST", "/api/quotes/123e4567-e89b-12d3-a456-426614174000/translation-items")
        .with_headers({"Content-Type": "application/json"})
        .with_body({})
        .will_respond_with(422)
        .with_headers({"Content-Type": "application/json"})
    )

    pact.write_file(PACT_DIR)


def test_list_translation_items_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list translation items for a quote")
        .given("a quote exists with no items")
        .with_request("GET", "/api/quotes/123e4567-e89b-12d3-a456-426614174000/translation-items")
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body([])
    )

    pact.write_file(PACT_DIR)
