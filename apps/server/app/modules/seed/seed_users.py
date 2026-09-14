from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.auth.security import hash_password
from app.shared.database import get_session_factory
from app.shared.EnvProvider import env_provider
from app.shared.supabase import SupabaseAdminClient


@dataclass(frozen=True)
class SeedUser:
    email: str
    password: str
    is_active: bool = True


SEED_USERS = [
    SeedUser(email="admin@spaceline.com.br", password="123456"),
    SeedUser(email="operador@spaceline.com.br", password="123456"),
    SeedUser(email="cliente@spaceline.com.br", password="123456"),
]


def seed_users(
    *,
    db: Session | None = None,
    supabase_admin_client: SupabaseAdminClient | None = None,
) -> list[str]:
    database_session = db or get_session_factory()()
    should_close_session = db is None
    admin_client = supabase_admin_client or SupabaseAdminClient(
        supabase_url=env_provider.get_supabase_url(),
        service_role_key=env_provider.get_supabase_service_role_key(),
    )

    try:
        seeded_emails = []

        for seed_user in SEED_USERS:
            auth_user = admin_client.create_or_get_user(seed_user.email, seed_user.password)
            _upsert_local_user(database_session, seed_user, auth_user["id"])
            seeded_emails.append(seed_user.email)

        database_session.commit()

        return seeded_emails
    finally:
        if should_close_session:
            database_session.close()


def _upsert_local_user(db: Session, seed_user: SeedUser, user_id: str) -> None:
    db.execute(
        text(
            """
            INSERT INTO users (id, email, password_hash, is_active)
            VALUES (:id, :email, :password_hash, :is_active)
            ON CONFLICT (email)
            DO UPDATE SET
                id = EXCLUDED.id,
                is_active = EXCLUDED.is_active,
                updated_at = NOW()
            """
        ),
        {
            "id": user_id,
            "email": seed_user.email,
            "password_hash": hash_password(seed_user.password),
            "is_active": seed_user.is_active,
        },
    )
