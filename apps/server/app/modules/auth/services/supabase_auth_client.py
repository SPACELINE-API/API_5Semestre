from typing import Any

import httpx

from apps.server.app.modules.auth.exceptions.exceptions import (
    SupabaseAuthInvalidCredentialsError,
    SupabaseAuthUnexpectedError,
)
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser, SupabaseAuthSession
from app.shared.supabase.client import create_supabase_headers, create_supabase_http_client


class SupabaseAuthClient:
    def __init__(
        self,
        supabase_url: str,
        anon_key: str,
        http_client: httpx.Client | None = None,
    ) -> None:
        self.supabase_url = supabase_url.rstrip("/")
        self.anon_key = anon_key
        self.http_client = http_client or create_supabase_http_client()

    def login_with_password(self, email: str, password: str) -> SupabaseAuthSession:
        try:
            response = self.http_client.post(
                f"{self.supabase_url}/auth/v1/token?grant_type=password",
                headers=create_supabase_headers(self.anon_key),
                json={"email": email, "password": password},
            )
        except httpx.HTTPError as error:
            raise SupabaseAuthUnexpectedError from error

        if response.status_code in {400, 401}:
            raise SupabaseAuthInvalidCredentialsError

        if response.status_code >= 300:
            raise SupabaseAuthUnexpectedError

        return self._build_session(response.json())

    def _build_session(self, payload: dict[str, Any]) -> SupabaseAuthSession:
        try:
            user = payload["user"]

            return SupabaseAuthSession(
                access_token=payload["access_token"],
                token_type=payload.get("token_type", "bearer"),
                expires_in=payload["expires_in"],
                user=SupabaseAuthenticatedUser(
                    id=user["id"],
                    email=user["email"],
                ),
            )
        except (KeyError, TypeError) as error:
            raise SupabaseAuthUnexpectedError from error
