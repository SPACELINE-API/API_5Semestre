"""Generate the roles Pact from responses returned by a running API."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any
from uuid import UUID

import httpx
from pact import Pact

sys.path.insert(0, str(Path(__file__).parents[1]))

from app.shared.pact_writer import write_pact

BASE_URL = os.getenv("PACT_PROVIDER_URL", "http://localhost:3333").rstrip("/")
EMAIL = os.getenv("PACT_ADMIN_EMAIL", "admin@spaceline.com.br")
PASSWORD = os.getenv("PACT_ADMIN_PASSWORD", "123456")
PACT_DIR = Path(__file__).parents[1]


def request(
    client: httpx.Client,
    method: str,
    path: str,
    token: str,
    **kwargs: Any,
) -> httpx.Response:
    response = client.request(
        method,
        path,
        headers={"Authorization": f"Bearer {token}"},
        **kwargs,
    )
    if response.is_error:
        raise RuntimeError(f"{method} {path} retornou {response.status_code}: {response.text}")
    return response


def add_interaction(
    pact: Pact,
    description: str,
    method: str,
    path: str,
    status_code: int,
    body: Any,
    request_body: Any | None = None,
) -> None:
    interaction = (
        pact.upon_receiving(description)
        .given("o provedor está com o seed aplicado")
        .with_request(method, path)
        .with_headers({"Authorization": "Bearer access-token"})
    )
    if request_body is not None:
        interaction = interaction.with_body(request_body)
    interaction.will_respond_with(status_code).with_headers(
        {"Content-Type": "application/json"}
    ).with_body(body)


def main() -> None:
    pact = Pact("web", "server").with_specification("V4")

    with httpx.Client(base_url=BASE_URL, timeout=15.0) as client:
        login = client.post(
            "/api/auth/login",
            json={"email": EMAIL, "password": PASSWORD},
        )
        if login.is_error:
            raise RuntimeError(f"POST /api/auth/login retornou {login.status_code}: {login.text}")
        token = login.json()["access_token"]

        listed = request(client, "GET", "/api/roles", token)
        roles = listed.json()
        if not roles:
            raise RuntimeError("A API não retornou roles para gerar o contrato")

        role = next((item for item in roles if item["name"] != "Administrador"), roles[0])
        role_id = UUID(role["id"])
        role_path = f"/api/roles/{role_id}"
        status_path = f"{role_path}/status"

        add_interaction(
            pact,
            "listar roles com autenticação válida",
            "GET",
            "/api/roles",
            listed.status_code,
            roles,
        )

        duplicate_body = {
            "name": role["name"],
            "description": role.get("description"),
            "permission_ids": [permission["id"] for permission in role["permissions"]],
        }
        duplicate = client.post(
            "/api/roles",
            headers={"Authorization": f"Bearer {token}"},
            json=duplicate_body,
        )
        if duplicate.status_code != 409:
            raise RuntimeError(
                f"POST /api/roles deveria retornar 409, mas retornou "
                f"{duplicate.status_code}: {duplicate.text}"
            )
        add_interaction(
            pact,
            "rejeitar role duplicada",
            "POST",
            "/api/roles",
            duplicate.status_code,
            duplicate.json(),
            duplicate_body,
        )

        fetched = request(client, "GET", role_path, token)
        add_interaction(
            pact,
            "consultar uma role existente",
            "GET",
            role_path,
            fetched.status_code,
            fetched.json(),
        )

        update_body = {
            "description": role.get("description"),
            "permission_ids": [permission["id"] for permission in role["permissions"]],
        }
        updated = request(client, "PATCH", role_path, token, json=update_body)
        add_interaction(
            pact,
            "atualizar uma role existente",
            "PATCH",
            role_path,
            updated.status_code,
            updated.json(),
            update_body,
        )

        original_status = role["is_active"]
        try:
            deactivated = request(client, "PATCH", status_path, token, json={"is_active": False})
            add_interaction(
                pact,
                "desativar uma role sem remover associações",
                "PATCH",
                status_path,
                deactivated.status_code,
                deactivated.json(),
                {"is_active": False},
            )
        finally:
            restored = request(
                client,
                "PATCH",
                status_path,
                token,
                json={"is_active": original_status},
            )
            add_interaction(
                pact,
                "restaurar o status original da role",
                "PATCH",
                status_path,
                restored.status_code,
                restored.json(),
                {"is_active": original_status},
            )

    pact_path = PACT_DIR / "web-server.json"
    if pact_path.exists():
        existing = json.loads(pact_path.read_text(encoding="utf-8"))
        role_descriptions = {
            "listar roles com autenticação válida",
            "rejeitar role duplicada",
            "consultar uma role existente",
            "atualizar uma role existente",
            "desativar uma role sem remover associações",
            "restaurar o status original da role",
        }
        existing["interactions"] = [
            interaction
            for interaction in existing.get("interactions", [])
            if interaction.get("description") not in role_descriptions
        ]
        pact_path.write_text(
            json.dumps(existing, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    write_pact(pact, PACT_DIR)
    print(f"Pact de roles gerado a partir de {BASE_URL}")


if __name__ == "__main__":
    main()
