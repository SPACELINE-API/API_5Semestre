from pathlib import Path

from pact import Pact

from app.shared.pact_writer import write_pact

PACT_DIR = Path(__file__).parents[4]


def test_create_quote_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create a quote")
        .given("the server is ready")
        .with_request("POST", "/api/quotes")
        .with_headers({"Content-Type": "application/json"})
        .with_body({})
        .will_respond_with(201)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "pending",
                "created_at": "2026-09-13T10:00:00Z",
                "updated_at": "2026-09-13T10:00:00Z",
            }
        )
    )

    write_pact(pact, PACT_DIR)


def test_generate_quote_from_approved_request_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to generate a quote from an approved request")
        .given("the request is approved")
        .with_request("POST", "/api/quotes/from-request/123e4567-e89b-12d3-a456-426614174000")
        .will_respond_with(201)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "id": "223e4567-e89b-12d3-a456-426614174000",
                "request_id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "pending",
                "customer_name": "João Silva",
                "enterprise": "Empresa X",
                "email": "joao@teste.com",
                "original_language": "Português",
                "translation_language": "Inglês",
                "customer_need": "Contrato social",
                "created_at": "2026-09-22T10:00:00Z",
                "updated_at": "2026-09-22T10:00:00Z",
            }
        )
    )

    write_pact(pact, PACT_DIR)


def test_generate_quote_from_request_error_contracts() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to generate a quote from a pending request")
        .given("the request is pending")
        .with_request("POST", "/api/quotes/from-request/123e4567-e89b-12d3-a456-426614174000")
        .will_respond_with(400)
    )
    (
        pact.upon_receiving("a request to generate a quote from an unknown request")
        .given("the request does not exist")
        .with_request("POST", "/api/quotes/from-request/323e4567-e89b-12d3-a456-426614174000")
        .will_respond_with(404)
    )
    (
        pact.upon_receiving("a request to generate a duplicate quote")
        .given("the request already has a quote")
        .with_request("POST", "/api/quotes/from-request/423e4567-e89b-12d3-a456-426614174000")
        .will_respond_with(409)
    )
    (
        pact.upon_receiving("a request to generate a quote with an invalid path id")
        .given("the path id is invalid")
        .with_request("POST", "/api/quotes/from-request/not-an-uuid")
        .will_respond_with(422)
    )

    write_pact(pact, PACT_DIR)
