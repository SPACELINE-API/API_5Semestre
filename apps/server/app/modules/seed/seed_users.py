from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.auth.policy import LOGIN_LOCKOUT_TIMEOUT_MINUTES, LOGIN_MAX_ATTEMPTS
from app.modules.auth.security import hash_password
from app.modules.auth.services.supabase_admin_client import SupabaseAdminClient
from app.modules.seed.database_cleaner import clear_application_tables
from app.shared.database import get_session_factory
from app.shared.EnvProvider import env_provider


@dataclass(frozen=True)
class SeedUser:
    email: str
    password: str
    role: str
    is_active: bool = True


SEED_USERS = [
    SeedUser(email="admin@spaceline.com.br", password="123456", role="admin"),
    SeedUser(email="operador@spaceline.com.br", password="123456", role="tradutor"),
    SeedUser(email="cliente@spaceline.com.br", password="123456", role="cliente"),
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
        clear_application_tables(database_session)
        seeded_emails = []

        for seed_user in SEED_USERS:
            auth_user = admin_client.create_or_get_user(seed_user.email, seed_user.password)
            _upsert_local_user(database_session, seed_user, auth_user["id"])
            seeded_emails.append(seed_user.email)

        _seed_system_parameters(database_session)

        database_session.commit()

        return seeded_emails
    finally:
        if should_close_session:
            database_session.close()
def _upsert_local_user(db: Session, seed_user: SeedUser, user_id: str) -> None:
    db.execute(
        text(
            """
            INSERT INTO users (id, email, password_hash, is_active, role)
            VALUES (:id, :email, :password_hash, :is_active, :role)
            ON CONFLICT (email)
            DO UPDATE SET
                id = EXCLUDED.id,
                is_active = EXCLUDED.is_active,
                role = EXCLUDED.role,
                failed_login_attempts = 0,
                locked_until = NULL,
                updated_at = NOW()
            """
        ),
        {
            "id": user_id,
            "email": seed_user.email,
            "password_hash": hash_password(seed_user.password),
            "is_active": seed_user.is_active,
            "role": seed_user.role,
        },
    )


def _seed_system_parameters(db: Session) -> None:
    for key, value in (
        ("login_lockout_timeout_minutes", LOGIN_LOCKOUT_TIMEOUT_MINUTES),
        ("login_max_attempts", LOGIN_MAX_ATTEMPTS),
    ):
        db.execute(
            text(
                """
                INSERT INTO system_parameters (id, key, value)
                VALUES (gen_random_uuid(), :key, :value)
                """
            ),
            {"key": key, "value": str(value)},
        )
