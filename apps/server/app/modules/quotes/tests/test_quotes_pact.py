from pathlib import Path

from pact import Pact

from app.shared.pact_writer import write_pact

PACT_DIR = Path(__file__).parents[4] / "pacts"


def test_create_quote_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create a quote")
        .given("the server is ready")
        .with_request("POST", "/api/quotes")
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "status": "draft",
            }
        )
        .will_respond_with(201)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "draft",
                "created_at": "2026-09-13T10:00:00Z",
                "updated_at": "2026-09-13T10:00:00Z",
            }
        )
    )

    write_pact(pact, PACT_DIR)
