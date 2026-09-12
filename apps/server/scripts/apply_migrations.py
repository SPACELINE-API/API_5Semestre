import sys
from importlib import import_module
from pathlib import Path

import psycopg

SERVER_PATH = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_PATH))

MIGRATIONS_PATH = Path("migrations")
MIGRATION_TABLE_NAME = "schema_migrations"
get_database_url = import_module("app.shared.database").get_database_url


def _migration_files() -> list[Path]:
    return sorted(MIGRATIONS_PATH.glob("*.sql"))


def apply_migrations() -> list[str]:
    applied_migrations: list[str] = []

    with psycopg.connect(_get_psycopg_database_url()) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {MIGRATION_TABLE_NAME} (
                    filename TEXT PRIMARY KEY,
                    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                )
                """
            )

            for migration_path in _migration_files():
                cursor.execute(
                    f"SELECT 1 FROM {MIGRATION_TABLE_NAME} WHERE filename = %s",
                    (migration_path.name,),
                )

                if cursor.fetchone() is not None:
                    continue

                cursor.execute(migration_path.read_text(encoding="utf-8"))
                cursor.execute(
                    f"INSERT INTO {MIGRATION_TABLE_NAME} (filename) VALUES (%s)",
                    (migration_path.name,),
                )
                applied_migrations.append(migration_path.name)

        connection.commit()

    return applied_migrations


def _get_psycopg_database_url() -> str:
    return get_database_url().replace("postgresql+psycopg://", "postgresql://", 1)


if __name__ == "__main__":
    migrations = apply_migrations()

    if not migrations:
        print("No pending SQL migrations.")
    else:
        for migration in migrations:
            print(f"Applied SQL migration: {migration}")
