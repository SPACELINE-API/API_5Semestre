from pathlib import Path

from pact import Pact

PACT_DIR = Path(__file__).parents[4] / "pacts"


def test_login_success_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a login request with valid credentials")
        .given("an active user exists")
        .with_request("POST", "/api/auth/login")
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "email": "user@example.com",
                "password": "secret123",
            }
        )
        .will_respond_with(200)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "access_token": "access-token",
                "token_type": "bearer",
                "expires_in": 3600,
                "user": {
                    "id": "user-id",
                    "email": "user@example.com",
                },
            }
        )
    )

    pact.write_file(PACT_DIR)


def test_login_invalid_credentials_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a login request with invalid credentials")
        .given("the provided credentials are invalid")
        .with_request("POST", "/api/auth/login")
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "email": "user@example.com",
                "password": "wrong-password",
            }
        )
        .will_respond_with(401)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "detail": "Credenciais inválidas",
            }
        )
    )

    pact.write_file(PACT_DIR)


def test_login_inactive_user_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a login request from an inactive user")
        .given("the user exists but is inactive")
        .with_request("POST", "/api/auth/login")
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "email": "inactive@example.com",
                "password": "secret123",
            }
        )
        .will_respond_with(403)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "detail": "Usuário sem permissão de acesso",
            }
        )
    )

    pact.write_file(PACT_DIR)


def test_login_internal_server_error_contract() -> None:
    pact = Pact("web", "server").with_specification("V4")

    (
        pact.upon_receiving("a login request causing an unexpected server error")
        .given("an unexpected authentication error occurs")
        .with_request("POST", "/api/auth/login")
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "email": "user@example.com",
                "password": "secret123",
            }
        )
        .will_respond_with(500)
        .with_headers({"Content-Type": "application/json"})
        .with_body(
            {
                "detail": "Erro interno do servidor",
            }
        )
    )

    pact.write_file(PACT_DIR)