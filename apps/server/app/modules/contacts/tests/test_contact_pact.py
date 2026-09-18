from pathlib import Path
from pact import Pact

from app.shared.pact_writer import write_pact

PACT_DIR = Path(__file__).parents[4] / "pacts"

def test_create_contact_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create a contact with valid data")
        .given("an active company exists")
        .with_request("POST", "/api/contacts")
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "name": "John Doe",
                "email": "johndoe@example.com",
                "phone": "(11) 98765-4321",
                "department": "Financeiro",
                "company_id": "00000000-0000-0000-0000-000000000001",
            }
        )
        .will_respond_with(201)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "message": "Contato cadastrado com sucesso.",
                "contact": {
                    "id": "00000000-0000-0000-0000-000000000002",
                    "name": "John Doe",
                    "email": "johndoe@example.com",
                    "phone": "(11) 98765-4321",
                    "department": "Financeiro",
                    "company_id": "00000000-0000-0000-0000-000000000001",
                    "created_at": "2023-01-01T00:00:00Z",
                    "updated_at": "2023-01-01T00:00:00Z",
                }
            }
        )
    )
    write_pact(pact, PACT_DIR)


def test_create_contact_invalid_email_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create a contact with invalid email")
        .given("an active company exists")
        .with_request("POST", "/api/contacts")
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "name": "John Doe",
                "email": "invalid-email",
                "phone": "(11) 98765-4321",
                "department": "Financeiro",
                "company_id": "00000000-0000-0000-0000-000000000001",
            }
        )
        .will_respond_with(422)
    )
    write_pact(pact, PACT_DIR)


def test_create_contact_invalid_phone_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create a contact with invalid phone")
        .given("an active company exists")
        .with_request("POST", "/api/contacts")
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "name": "John Doe",
                "email": "johndoe@example.com",
                "phone": "11987654321",
                "department": "Financeiro",
                "company_id": "00000000-0000-0000-0000-000000000001",
            }
        )
        .will_respond_with(422)
    )
    write_pact(pact, PACT_DIR)


def test_create_contact_missing_fields_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create a contact with missing fields")
        .given("an active company exists")
        .with_request("POST", "/api/contacts")
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "name": "John Doe",
                "email": "johndoe@example.com",
            }
        )
        .will_respond_with(422)
    )
    write_pact(pact, PACT_DIR)
