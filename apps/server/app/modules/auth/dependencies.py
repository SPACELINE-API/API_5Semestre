from app.modules.auth.services.supabase_auth_client import SupabaseAuthClient
from app.shared.supabase import get_supabase_config


def get_supabase_auth_client() -> SupabaseAuthClient:
    config = get_supabase_config()

    return SupabaseAuthClient(
        supabase_url=config.url,
        anon_key=config.anon_key,
    )
