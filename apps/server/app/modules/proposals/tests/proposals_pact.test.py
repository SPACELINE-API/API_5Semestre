from pathlib import Path

from pact import Pact

from app.shared.pact_writer import write_pact

PACT_DIR = Path(__file__).parents[4]
BASE_PATH = "/api/quotes/proposals"
AUTH_HEADERS = {"Authorization": "Bearer valid-token"}

_PROPOSAL_ITEM = {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "customer_name": "Cliente Teste",
    "enterprise": "Empresa Teste",
    "translation_service": "Português → Inglês",
    "total_value": "0.00",
    "status": "pending",
    "created_at": "2026-09-13T10:00:00Z",
}

_LIST_RESPONSE = {
    "items": [_PROPOSAL_ITEM],
    "total": 1,
    "page": 1,
    "page_size": 10,
}


def test_list_proposals_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list commercial proposals")
        .given("the user has proposals.read permission and proposals exist")
        .with_request("GET", BASE_PATH)
        .with_headers(AUTH_HEADERS)
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body(_LIST_RESPONSE)
    )

    write_pact(pact, PACT_DIR)


def test_list_proposals_empty_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list proposals when none exist")
        .given("the user has proposals.read permission and no proposals exist")
        .with_request("GET", BASE_PATH)
        .with_headers(AUTH_HEADERS)
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body({"items": [], "total": 0, "page": 1, "page_size": 10})
    )

    write_pact(pact, PACT_DIR)


def test_list_proposals_with_date_filter_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list proposals filtered by date range")
        .given("the user has proposals.read permission and proposals exist in range")
        .with_request("GET", BASE_PATH)
        .with_headers(AUTH_HEADERS)
        .with_query_parameter("start_date", "2026-01-01")
        .with_query_parameter("end_date", "2026-12-31")
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body(_LIST_RESPONSE)
    )

    write_pact(pact, PACT_DIR)


def test_list_proposals_with_status_filter_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list approved proposals")
        .given("the user has proposals.read permission and approved proposals exist")
        .with_request("GET", BASE_PATH)
        .with_headers(AUTH_HEADERS)
        .with_query_parameter("status", "approved")
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "items": [{**_PROPOSAL_ITEM, "status": "approved"}],
                "total": 1,
                "page": 1,
                "page_size": 10,
            }
        )
    )

    write_pact(pact, PACT_DIR)


def test_list_proposals_with_pagination_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list proposals with pagination")
        .given("the user has proposals.read permission and multiple proposals exist")
        .with_request("GET", BASE_PATH)
        .with_headers(AUTH_HEADERS)
        .with_query_parameter("page", "2")
        .with_query_parameter("page_size", "5")
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body({"items": [], "total": 10, "page": 2, "page_size": 5})
    )

    write_pact(pact, PACT_DIR)


def test_list_proposals_unauthenticated_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list proposals without authentication")
        .given("the user is not authenticated")
        .with_request("GET", BASE_PATH)
        .will_respond_with(401)
        .with_headers({"Content-Type": "application/json"})
    )

    write_pact(pact, PACT_DIR)


def test_list_proposals_forbidden_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list proposals without permission")
        .given("the user does not have proposals.read permission")
        .with_request("GET", BASE_PATH)
        .with_headers(AUTH_HEADERS)
        .will_respond_with(403)
        .with_headers({"Content-Type": "application/json"})
    )

    write_pact(pact, PACT_DIR)


def test_list_proposals_inverted_date_range_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list proposals with inverted date range")
        .given("the user has proposals.read permission")
        .with_request("GET", BASE_PATH)
        .with_headers(AUTH_HEADERS)
        .with_query_parameter("start_date", "2026-12-31")
        .with_query_parameter("end_date", "2026-01-01")
        .will_respond_with(422)
        .with_headers({"Content-Type": "application/json"})
        .with_body({"detail": "start_date não pode ser posterior a end_date."})
    )

    write_pact(pact, PACT_DIR)


def test_list_proposals_invalid_status_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list proposals with invalid status")
        .given("the user has proposals.read permission")
        .with_request("GET", BASE_PATH)
        .with_headers(AUTH_HEADERS)
        .with_query_parameter("status", "invalid_status")
        .will_respond_with(422)
        .with_headers({"Content-Type": "application/json"})
    )

    write_pact(pact, PACT_DIR)
