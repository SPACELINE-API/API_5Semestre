from dataclasses import dataclass


@dataclass(frozen=True)
class SupabaseAuthenticatedUser:
    id: str
    email: str


@dataclass(frozen=True)
class SupabaseAuthSession:
    access_token: str
    token_type: str
    expires_in: int
    user: SupabaseAuthenticatedUser
