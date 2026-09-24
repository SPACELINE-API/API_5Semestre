from pathlib import Path

from pact import Pact

from app.shared.pact_writer import write_pact

PACT_DIR = Path(__file__).parents[4] / "pacts"


def test_search_translators_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to search translators with valid filters")
        .given("at least one active translator matching the filters exists")
        .with_request("GET", "/api/translators")
        .with_query_parameters({"language": "en", "specialty": "Juridico", "status": "true"})
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "items": [
                    {
                        "id": "00000000-0000-0000-0000-000000000001",
                        "name": "Joao Tradutor",
                        "email": "joao.tradutor@spaceline.com.br",
                        "phone": "11987654321",
                        "is_active": True,
                        "created_at": "2023-01-01T00:00:00Z",
                        "updated_at": "2023-01-01T00:00:00Z",
                        "qualifications": [
                            {
                                "id": "00000000-0000-0000-0000-000000000002",
                                "name": "Juridico",
                                "description": None,
                            }
                        ],
                        "language_pairs": [
                            {
                                "id": "00000000-0000-0000-0000-000000000003",
                                "language_pair_id": "00000000-0000-0000-0000-000000000004",
                                "proficiency_level": "fluent",
                            }
                        ],
                    }
                ],
                "total": 1,
                "page": 1,
                "page_size": 20,
            }
        )
    )
    write_pact(pact, PACT_DIR)


def test_search_translators_without_filters_returns_all_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to search translators without filters")
        .given("no filters are provided")
        .with_request("GET", "/api/translators")
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body({"items": [], "total": 0, "page": 1, "page_size": 20})
    )
    write_pact(pact, PACT_DIR)


def test_search_translators_with_pagination_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to search translators with pagination")
        .given("more translators exist than fit in a single page")
        .with_request("GET", "/api/translators")
        .with_query_parameters({"page": "2", "page_size": "10"})
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body({"items": [], "total": 15, "page": 2, "page_size": 10})
    )
    write_pact(pact, PACT_DIR)


def test_search_translators_invalid_status_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to search translators with an invalid status filter")
        .given("no translator data is required")
        .with_request("GET", "/api/translators")
        .with_query_parameters({"status": "not-a-boolean"})
        .will_respond_with(422)
    )
    write_pact(pact, PACT_DIR)


def test_search_translators_invalid_page_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to search translators with an invalid page number")
        .given("no translator data is required")
        .with_request("GET", "/api/translators")
        .with_query_parameters({"page": "0"})
        .will_respond_with(422)
    )
    write_pact(pact, PACT_DIR)
