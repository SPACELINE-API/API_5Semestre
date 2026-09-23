from pathlib import Path

from pact import Pact

from app.shared.pact_writer import write_pact

PACT_DIR = Path(__file__).parents[4]


def test_search_companies_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to search companies with valid filters")
        .given("at least one active company matching the filters exists")
        .with_request("GET", "/api/clients")
        .with_query_parameters({"name": "Acme", "status": "true", "product": "Traducao"})
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "items": [
                    {
                        "id": "00000000-0000-0000-0000-000000000001",
                        "legal_name": "Acme Tecnologia Ltda",
                        "trade_name": "Acme Tech",
                        "cnpj": "11444777000161",
                        "is_active": True,
                        "industry": "juridico",
                        "product": "Traducao Juramentada",
                        "phone": "11987654321",
                        "email": "contato@acmetech.com",
                        "zip_code": "01310-100",
                        "street": "Avenida Paulista",
                        "number": "1000",
                        "complement": None,
                        "neighborhood": "Bela Vista",
                        "city": "Sao Paulo",
                        "state": "SP",
                        "created_at": "2023-01-01T00:00:00Z",
                        "updated_at": "2023-01-01T00:00:00Z",
                    }
                ],
                "total": 1,
                "page": 1,
                "page_size": 20,
            }
        )
    )
    write_pact(pact, PACT_DIR)


def test_search_companies_without_filters_returns_all_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to search companies without filters")
        .given("no filters are provided")
        .with_request("GET", "/api/clients")
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body({"items": [], "total": 0, "page": 1, "page_size": 20})
    )
    write_pact(pact, PACT_DIR)


def test_search_companies_with_pagination_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to search companies with pagination")
        .given("more companies exist than fit in a single page")
        .with_request("GET", "/api/clients")
        .with_query_parameters({"page": "2", "page_size": "10"})
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body({"items": [], "total": 15, "page": 2, "page_size": 10})
    )
    write_pact(pact, PACT_DIR)


def test_search_companies_invalid_status_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to search companies with an invalid status filter")
        .given("no company data is required")
        .with_request("GET", "/api/clients")
        .with_query_parameters({"status": "not-a-boolean"})
        .will_respond_with(422)
    )
    write_pact(pact, PACT_DIR)


def test_search_companies_invalid_page_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to search companies with an invalid page number")
        .given("no company data is required")
        .with_request("GET", "/api/clients")
        .with_query_parameters({"page": "0"})
        .will_respond_with(422)
    )
    write_pact(pact, PACT_DIR)
