from apps.server.app.modules.auth.security.security import verify_password
from app.modules.seed.seed_users import SEED_USERS, seed_users


class FakeDatabaseSession:
    def __init__(self) -> None:
        self.executed_statements: list[tuple[object, dict[str, object]]] = []
        self.committed = False
        self.closed = False

    def execute(
        self, statement: object, params: dict[str, object] | None = None
    ) -> None:
        self.executed_statements.append((statement, params or {}))

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
    assert [user.role for user in SEED_USERS] == ["admin", "tradutor", "cliente"]
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
    insert_statements = [
        params
        for statement, params in db.executed_statements
        if "INSERT INTO users" in str(statement)
    ]
    assert [params["email"] for params in insert_statements] == seeded_emails
    password_hashes = [params["password_hash"] for params in insert_statements]

    assert password_hashes != ["123456", "123456", "123456"]
    assert all(isinstance(password_hash, str) for password_hash in password_hashes)
    assert all(verify_password("123456", password_hash) for password_hash in password_hashes)
    assert db.committed is True
    assert db.closed is False
    parameter_values = {
        params["key"]: params["value"]
        for statement, params in db.executed_statements
        if "INSERT INTO system_parameters" in str(statement)
    }
    assert parameter_values == {
        "login_lockout_timeout_minutes": "5",
        "login_max_attempts": "3",
    }


def test_seed_users_clears_application_tables_before_inserting_seed_data() -> None:
    db = FakeDatabaseSession()

    seed_users(db=db, supabase_admin_client=FakeSupabaseAdminClient())

    statements = [str(statement) for statement, _ in db.executed_statements]
    delete_indexes = [index for index, statement in enumerate(statements) if "DELETE" in statement]
    insert_indexes = [index for index, statement in enumerate(statements) if "INSERT INTO users" in statement]

    assert delete_indexes
    assert insert_indexes
    assert max(delete_indexes) < min(insert_indexes)
