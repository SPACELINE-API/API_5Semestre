from app.shared.EnvProvider import env_provider
from app.shared.supabase.auth_client import SupabaseAuthClient


def get_supabase_auth_client() -> SupabaseAuthClient:
    return SupabaseAuthClient(
        supabase_url=env_provider.get_supabase_url(),
        anon_key=env_provider.get_supabase_anon_key(),
    )
