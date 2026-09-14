from app.modules.auth.security import verify_password
from app.modules.seed.seed_users import SEED_USERS, seed_users


class FakeDatabaseSession:
    def __init__(self) -> None:
        self.executed_statements: list[tuple[object, dict[str, object]]] = []
        self.committed = False
        self.closed = False

    def execute(self, statement: object, params: dict[str, object]) -> None:
        self.executed_statements.append((statement, params))

    def commit(self) -> None:
        self.committed = True

    def close(self) -> None:
        self.closed = True


class FakeSupabaseAdminClient:
    def __init__(self) -> None:
        self.created_users: list[tuple[str, str]] = []

    def create_or_get_user(self, email: str, password: str) -> dict[str, str]:
        self.created_users.append((email, password))

        return {"id": f"00000000-0000-0000-0000-{len(self.created_users):012d}"}


def test_seed_users_defines_three_users_with_default_password() -> None:
    assert len(SEED_USERS) == 3
    assert {user.password for user in SEED_USERS} == {"123456"}
    assert [user.email for user in SEED_USERS] == [
        "admin@spaceline.com.br",
        "operador@spaceline.com.br",
        "cliente@spaceline.com.br",
    ]


def test_seed_users_creates_auth_users_and_upserts_local_users() -> None:
    db = FakeDatabaseSession()
    supabase_admin_client = FakeSupabaseAdminClient()

    seeded_emails = seed_users(db=db, supabase_admin_client=supabase_admin_client)

    assert seeded_emails == [
        "admin@spaceline.com.br",
        "operador@spaceline.com.br",
        "cliente@spaceline.com.br",
    ]
    assert supabase_admin_client.created_users == [
        ("admin@spaceline.com.br", "123456"),
        ("operador@spaceline.com.br", "123456"),
        ("cliente@spaceline.com.br", "123456"),
    ]
    assert [params["email"] for _, params in db.executed_statements] == seeded_emails
    password_hashes = [params["password_hash"] for _, params in db.executed_statements]

    assert password_hashes != ["123456", "123456", "123456"]
    assert all(isinstance(password_hash, str) for password_hash in password_hashes)
    assert all(verify_password("123456", password_hash) for password_hash in password_hashes)
    assert db.committed is True
    assert db.closed is False
