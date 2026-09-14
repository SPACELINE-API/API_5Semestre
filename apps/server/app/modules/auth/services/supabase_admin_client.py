from typing import Any

import httpx

from app.modules.auth.exceptions import SupabaseAdminUnexpectedError
from app.shared.supabase import create_supabase_headers, create_supabase_http_client


class SupabaseAdminClient:
    def __init__(
        self,
        supabase_url: str,
        service_role_key: str,
        http_client: httpx.Client | None = None,
    ) -> None:
        if not service_role_key:
            raise SupabaseAdminUnexpectedError("SUPABASE_SERVICE_ROLE_KEY is not configured")

        self.supabase_url = supabase_url.rstrip("/")
        self.service_role_key = service_role_key
        self.http_client = http_client or create_supabase_http_client()

    def create_or_get_user(self, email: str, password: str) -> dict[str, Any]:
        existing_user = self._find_user_by_email(email)

        if existing_user is not None:
            return existing_user

        response = self.http_client.post(
            f"{self.supabase_url}/auth/v1/admin/users",
            headers=create_supabase_headers(self.service_role_key),
            json={
                "email": email,
                "password": password,
                "email_confirm": True,
            },
        )

        if response.status_code >= 300:
            raise SupabaseAdminUnexpectedError(response.text)

        return response.json()

    def _find_user_by_email(self, email: str) -> dict[str, Any] | None:
        response = self.http_client.get(
            f"{self.supabase_url}/auth/v1/admin/users",
            headers=create_supabase_headers(self.service_role_key),
            params={"page": 1, "per_page": 1000},
        )

        if response.status_code >= 300:
            raise SupabaseAdminUnexpectedError(response.text)

        users = response.json().get("users", [])

        return next((user for user in users if user.get("email") == email), None)
