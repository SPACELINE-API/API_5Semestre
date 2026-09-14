from app.shared.supabase.admin_client import (
    SupabaseAdminClient,
    SupabaseAdminUnexpectedError,
)
from app.shared.supabase.auth_client import SupabaseAuthClient
from app.shared.supabase.dependencies import get_supabase_auth_client
from app.shared.supabase.exceptions import (
    SupabaseAuthInvalidCredentialsError,
    SupabaseAuthUnexpectedError,
)
from app.shared.supabase.schemas import SupabaseAuthenticatedUser, SupabaseAuthSession

__all__ = [
    "SupabaseAdminClient",
    "SupabaseAdminUnexpectedError",
    "SupabaseAuthClient",
    "SupabaseAuthInvalidCredentialsError",
    "SupabaseAuthSession",
    "SupabaseAuthUnexpectedError",
    "SupabaseAuthenticatedUser",
    "get_supabase_auth_client",
]
