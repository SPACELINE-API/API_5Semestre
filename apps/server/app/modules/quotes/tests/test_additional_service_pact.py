from pathlib import Path

from pact import Pact

PACT_DIR = Path(__file__).parents[4] / "pacts"

BASE_PATH = "/api/quotes/additional-services"
ADDITIONAL_SERVICE_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7"
QUOTE_ID = "123e4567-e89b-12d3-a456-426614174000"
SERVICE_ORDER_ID = "9b2f8c1e-3d4a-4f6b-8a7c-1e2d3f4a5b6c"
NOT_FOUND_ID = "00000000-0000-0000-0000-000000000000"

AUTH_HEADERS = {"Authorization": "Bearer valid-token"}
JSON_AUTH_HEADERS = {**AUTH_HEADERS, "Content-Type": "application/json"}

VALID_QUOTE_PAYLOAD = {
    "quote_id": QUOTE_ID,
    "description": "Tradução de documento secundário",
    "price": "150.00",
}


def _additional_service_body(service_order_id: str | None = None) -> dict:
    return {
        "id": ADDITIONAL_SERVICE_ID,
        "quote_id": QUOTE_ID,
        "service_order_id": service_order_id,
        "created_by": None,
        "description": "Tradução de documento secundário",
        "price": "150.00",
        "status": "pending",
        "created_at": "2026-10-12T10:00:00Z",
        "updated_at": "2026-10-12T10:00:00Z",
    }


def test_create_additional_service_for_quote_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create an additional service for a quote")
        .given("the user has quotes.write permission and a quote exists")
        .with_request("POST", BASE_PATH)
        .with_headers(JSON_AUTH_HEADERS)
        .with_body(VALID_QUOTE_PAYLOAD)
        .will_respond_with(201)
        .with_headers({"Content-Type": "application/json"})
        .with_body(_additional_service_body())
    )

    pact.write_file(PACT_DIR)


def test_create_additional_service_for_service_order_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create an additional service for a service order")
        .given("the user has quotes.write permission and a service order exists")
        .with_request("POST", BASE_PATH)
        .with_headers(JSON_AUTH_HEADERS)
        .with_body(
            {
                "service_order_id": SERVICE_ORDER_ID,
                "description": "Tradução de documento secundário",
                "price": "150.00",
            }
        )
        .will_respond_with(201)
        .with_headers({"Content-Type": "application/json"})
        .with_body(_additional_service_body(SERVICE_ORDER_ID))
    )

    pact.write_file(PACT_DIR)


def test_create_additional_service_unauthenticated_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create an additional service without authentication")
        .given("the user is not authenticated")
        .with_request("POST", BASE_PATH)
        .with_headers({"Content-Type": "application/json"})
        .with_body(VALID_QUOTE_PAYLOAD)
        .will_respond_with(401)
        .with_headers({"Content-Type": "application/json"})
    )

    pact.write_file(PACT_DIR)


def test_create_additional_service_forbidden_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create an additional service without permission")
        .given("the user does not have quotes.write permission")
        .with_request("POST", BASE_PATH)
        .with_headers(JSON_AUTH_HEADERS)
        .with_body(VALID_QUOTE_PAYLOAD)
        .will_respond_with(403)
        .with_headers({"Content-Type": "application/json"})
    )

    pact.write_file(PACT_DIR)


def test_create_additional_service_missing_fields_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create an additional service with missing body")
        .given("the user has quotes.write permission")
        .with_request("POST", BASE_PATH)
        .with_headers(JSON_AUTH_HEADERS)
        .with_body({})
        .will_respond_with(422)
        .with_headers({"Content-Type": "application/json"})
    )

    pact.write_file(PACT_DIR)


def test_create_additional_service_with_both_targets_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving(
            "a request to create an additional service with both quote and service order"
        )
        .given("the user has quotes.write permission")
        .with_request("POST", BASE_PATH)
        .with_headers(JSON_AUTH_HEADERS)
        .with_body({**VALID_QUOTE_PAYLOAD, "service_order_id": SERVICE_ORDER_ID})
        .will_respond_with(422)
        .with_headers({"Content-Type": "application/json"})
    )

    pact.write_file(PACT_DIR)


def test_create_additional_service_negative_price_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create an additional service with negative price")
        .given("the user has quotes.write permission")
        .with_request("POST", BASE_PATH)
        .with_headers(JSON_AUTH_HEADERS)
        .with_body({**VALID_QUOTE_PAYLOAD, "price": "-10.00"})
        .will_respond_with(422)
        .with_headers({"Content-Type": "application/json"})
    )

    pact.write_file(PACT_DIR)


def test_create_additional_service_quote_not_found_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create an additional service for a missing quote")
        .given("the user has quotes.write permission and the quote does not exist")
        .with_request("POST", BASE_PATH)
        .with_headers(JSON_AUTH_HEADERS)
        .with_body({**VALID_QUOTE_PAYLOAD, "quote_id": NOT_FOUND_ID})
        .will_respond_with(404)
        .with_headers({"Content-Type": "application/json"})
        .with_body({"detail": "Orçamento não encontrado"})
    )

    pact.write_file(PACT_DIR)


def test_create_additional_service_service_order_not_found_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving(
            "a request to create an additional service for a missing service order"
        )
        .given("the user has quotes.write permission and the service order does not exist")
        .with_request("POST", BASE_PATH)
        .with_headers(JSON_AUTH_HEADERS)
        .with_body(
            {
                "service_order_id": NOT_FOUND_ID,
                "description": "Tradução de documento secundário",
                "price": "150.00",
            }
        )
        .will_respond_with(404)
        .with_headers({"Content-Type": "application/json"})
        .with_body({"detail": "Ordem de serviço não encontrada"})
    )

    pact.write_file(PACT_DIR)


def test_create_additional_service_duplicate_description_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to create a duplicated additional service")
        .given(
            "the user has quotes.write permission and the quote already has "
            "an additional service with the same description"
        )
        .with_request("POST", BASE_PATH)
        .with_headers(JSON_AUTH_HEADERS)
        .with_body(VALID_QUOTE_PAYLOAD)
        .will_respond_with(409)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {"detail": "Já existe um serviço adicional com essa descrição neste orçamento"}
        )
    )

    pact.write_file(PACT_DIR)


def test_list_additional_services_by_quote_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list additional services of a quote")
        .given("the user has quotes.read permission and a quote with additional services exists")
        .with_request("GET", BASE_PATH)
        .with_headers(AUTH_HEADERS)
        .with_query_parameter("quote_id", QUOTE_ID)
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body([_additional_service_body()])  # type: ignore[arg-type]
    )

    pact.write_file(PACT_DIR)


def test_list_additional_services_by_service_order_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list additional services of a service order")
        .given(
            "the user has quotes.read permission and a service order "
            "with additional services exists"
        )
        .with_request("GET", BASE_PATH)
        .with_headers(AUTH_HEADERS)
        .with_query_parameter("service_order_id", SERVICE_ORDER_ID)
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body([_additional_service_body(SERVICE_ORDER_ID)])  # type: ignore[arg-type]
    )

    pact.write_file(PACT_DIR)


def test_list_additional_services_empty_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list additional services of a quote without services")
        .given("the user has quotes.read permission and a quote without additional services exists")
        .with_request("GET", BASE_PATH)
        .with_headers(AUTH_HEADERS)
        .with_query_parameter("quote_id", QUOTE_ID)
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body([])  # type: ignore[arg-type]
    )

    pact.write_file(PACT_DIR)


def test_list_additional_services_without_filter_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list additional services without filters")
        .given("the user has quotes.read permission")
        .with_request("GET", BASE_PATH)
        .with_headers(AUTH_HEADERS)
        .will_respond_with(422)
        .with_headers({"Content-Type": "application/json"})
        .with_body({"detail": "Informe apenas um entre quote_id e service_order_id"})
    )

    pact.write_file(PACT_DIR)


def test_list_additional_services_quote_not_found_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list additional services of a missing quote")
        .given("the user has quotes.read permission and the quote does not exist")
        .with_request("GET", BASE_PATH)
        .with_headers(AUTH_HEADERS)
        .with_query_parameter("quote_id", NOT_FOUND_ID)
        .will_respond_with(404)
        .with_headers({"Content-Type": "application/json"})
        .with_body({"detail": "Orçamento não encontrado"})
    )

    pact.write_file(PACT_DIR)


def test_list_additional_services_unauthenticated_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list additional services without authentication")
        .given("the user is not authenticated")
        .with_request("GET", BASE_PATH)
        .with_query_parameter("quote_id", QUOTE_ID)
        .will_respond_with(401)
        .with_headers({"Content-Type": "application/json"})
    )

    pact.write_file(PACT_DIR)


def test_list_additional_services_forbidden_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to list additional services without permission")
        .given("the user does not have quotes.read permission")
        .with_request("GET", BASE_PATH)
        .with_headers(AUTH_HEADERS)
        .with_query_parameter("quote_id", QUOTE_ID)
        .will_respond_with(403)
        .with_headers({"Content-Type": "application/json"})
    )

    pact.write_file(PACT_DIR)


def test_get_additional_service_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to get an additional service by id")
        .given("the user has quotes.read permission and an additional service exists")
        .with_request("GET", f"{BASE_PATH}/{ADDITIONAL_SERVICE_ID}")
        .with_headers(AUTH_HEADERS)
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body(_additional_service_body())
    )

    pact.write_file(PACT_DIR)


def test_get_additional_service_not_found_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to get a missing additional service")
        .given("the user has quotes.read permission and the additional service does not exist")
        .with_request("GET", f"{BASE_PATH}/{NOT_FOUND_ID}")
        .with_headers(AUTH_HEADERS)
        .will_respond_with(404)
        .with_headers({"Content-Type": "application/json"})
        .with_body({"detail": "Serviço adicional não encontrado"})
    )

    pact.write_file(PACT_DIR)


def test_get_additional_service_invalid_id_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to get an additional service with invalid id")
        .given("the user has quotes.read permission")
        .with_request("GET", f"{BASE_PATH}/invalid-id")
        .with_headers(AUTH_HEADERS)
        .will_respond_with(422)
        .with_headers({"Content-Type": "application/json"})
    )

    pact.write_file(PACT_DIR)


def test_delete_additional_service_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to delete an additional service")
        .given("the user has quotes.write permission and an additional service exists")
        .with_request("DELETE", f"{BASE_PATH}/{ADDITIONAL_SERVICE_ID}")
        .with_headers(AUTH_HEADERS)
        .will_respond_with(204)
    )

    pact.write_file(PACT_DIR)


def test_delete_additional_service_not_found_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to delete a missing additional service")
        .given("the user has quotes.write permission and the additional service does not exist")
        .with_request("DELETE", f"{BASE_PATH}/{NOT_FOUND_ID}")
        .with_headers(AUTH_HEADERS)
        .will_respond_with(404)
        .with_headers({"Content-Type": "application/json"})
        .with_body({"detail": "Serviço adicional não encontrado"})
    )

    pact.write_file(PACT_DIR)


def test_delete_additional_service_unauthenticated_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to delete an additional service without authentication")
        .given("the user is not authenticated")
        .with_request("DELETE", f"{BASE_PATH}/{ADDITIONAL_SERVICE_ID}")
        .will_respond_with(401)
        .with_headers({"Content-Type": "application/json"})
    )

    pact.write_file(PACT_DIR)


def test_delete_additional_service_forbidden_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a request to delete an additional service without permission")
        .given("the user does not have quotes.write permission")
        .with_request("DELETE", f"{BASE_PATH}/{ADDITIONAL_SERVICE_ID}")
        .with_headers(AUTH_HEADERS)
        .will_respond_with(403)
        .with_headers({"Content-Type": "application/json"})
    )

    pact.write_file(PACT_DIR)
