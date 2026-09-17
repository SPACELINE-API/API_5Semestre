from dataclasses import dataclass

import httpx

from app.shared.EnvProvider import env_provider


@dataclass(frozen=True)
class SupabaseConfig:
    url: str
    anon_key: str
    service_role_key: str


def get_supabase_config() -> SupabaseConfig:
    return SupabaseConfig(
        url=env_provider.get_supabase_url().rstrip("/"),
        anon_key=env_provider.get_supabase_anon_key(),
        service_role_key=env_provider.get_supabase_service_role_key(),
    )


def create_supabase_http_client() -> httpx.Client:
    return httpx.Client(timeout=10)


def create_supabase_headers(api_key: str) -> dict[str, str]:
    return {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
