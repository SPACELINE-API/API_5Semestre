from pathlib import Path

from pact import Pact

from app.shared.pact_writer import write_pact

PACT_DIR = Path(__file__).parents[4]


def test_list_proposals_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list commercial proposals")
        .given("the server is ready")
        .with_request("GET", "/api/quotes/proposals")
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "items": [
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "customer_name": "Acme Corp",
                        "enterprise": "Acme",
                        "original_language": "pt-BR",
                        "translation_language": "en-US",
                        "customer_need": "Contrato",
                        "total_value": 500.00,
                        "status": "pending",
                        "created_at": "2026-01-15T10:00:00Z",
                        "updated_at": "2026-01-15T10:00:00Z",
                    }
                ],
                "total": 1,
                "page": 1,
                "page_size": 10,
                "total_pages": 1,
            }
        )
    )

    write_pact(pact, PACT_DIR)


def test_list_proposals_filtered_by_status_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list proposals filtered by status approved")
        .given("there are approved proposals")
        .with_request("GET", "/api/quotes/proposals?status=approved")
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "items": [],
                "total": 0,
                "page": 1,
                "page_size": 10,
                "total_pages": 0,
            }
        )
    )

    write_pact(pact, PACT_DIR)


def test_list_proposals_filtered_by_period_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list proposals filtered by period")
        .given("there are proposals in the given period")
        .with_request("GET", "/api/quotes/proposals?start_date=2026-01-01&end_date=2026-12-31")
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "items": [],
                "total": 0,
                "page": 1,
                "page_size": 10,
                "total_pages": 0,
            }
        )
    )

    write_pact(pact, PACT_DIR)


def test_list_proposals_unauthorized_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list proposals without permission")
        .given("the user does not have proposals:read permission")
        .with_request("GET", "/api/quotes/proposals")
        .will_respond_with(403)
    )

    write_pact(pact, PACT_DIR)


def test_list_proposals_paginated_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list proposals with pagination")
        .given("there are many proposals")
        .with_request("GET", "/api/quotes/proposals?page=2&page_size=5")
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "items": [],
                "total": 10,
                "page": 2,
                "page_size": 5,
                "total_pages": 2,
            }
        )
    )

    write_pact(pact, PACT_DIR)
