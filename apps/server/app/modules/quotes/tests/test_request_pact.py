from pathlib import Path

from pact import Pact

PACT_DIR = Path(__file__).parents[4] / "pacts"


def test_create_request_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create a valid request")
        .given("the request payload is valid")
        .with_request("POST", "/api/quotes/requests")
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "customer_name": "João Silva",
                "enterprise": "Empresa X",
                "email": "joao@teste.com",
                "original_language": "Português",
                "translation_language": "Francês",
                "customer_need": "Contrato Social",
            }
        )
        .will_respond_with(201)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "customer_name": "João Silva",
                "enterprise": "Empresa X",
                "email": "joao@teste.com",
                "original_language": "Português",
                "translation_language": "Francês",
                "customer_need": "Contrato Social",
                "status": "pending",
                "request_date": "2026-09-15",
            }
        )
    )

    pact.write_file(PACT_DIR)


def test_create_request_missing_fields_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create a request with missing body")
        .given("the request is completely empty")
        .with_request("POST", "/api/quotes/requests")
        .with_headers({"Content-Type": "application/json"})
        .with_body({})
        .will_respond_with(422)
        .with_headers({"Content-Type": "application/json"})
    )

    pact.write_file(PACT_DIR)


def test_list_requests_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list requests")
        .given("no requests exist")
        .with_request("GET", "/api/quotes/requests")
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body([])  
    )

    pact.write_file(PACT_DIR)