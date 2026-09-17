import sys
from contextlib import redirect_stdout
from datetime import datetime
from importlib import import_module
from io import StringIO
from pathlib import Path

import psycopg
from alembic import command
from alembic.config import Config

SERVER_PATH = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_PATH))

MIGRATIONS_PATH = Path("migrations")
VERSIONS_PATH = MIGRATIONS_PATH / "versions"
get_database_url = import_module("app.shared.database").get_database_url


def create_migration_stem() -> str:
    existing_migrations = list(MIGRATIONS_PATH.glob("migration*_*.sql"))
    next_number = len(existing_migrations) + 1
    current_datetime = get_current_datetime()

    return f"migration{next_number}_{current_datetime:%d%m}_{current_datetime:%H%M}"


def create_migration_name() -> str:
    return create_migration_stem()


def get_current_datetime() -> datetime:
    return datetime.now()


def _strip_alembic_version_sql(sql: str) -> str:
    lines = sql.splitlines()
    cleaned_lines: list[str] = []
    skipping_alembic_version_statement = False

    for line in lines:
        if "alembic_version" in line:
            skipping_alembic_version_statement = not line.rstrip().endswith(";")
            continue

        if skipping_alembic_version_statement:
            if line.rstrip().endswith(";"):
                skipping_alembic_version_statement = False
            continue

        if line.startswith("BEGIN;") or line.startswith("COMMIT;"):
            continue

        cleaned_lines.append(line)

    return "\n".join(cleaned_lines).strip() + "\n"


def _migration_has_changes(sql: str) -> bool:
    statements = [
        line.strip()
        for line in sql.splitlines()
        if line.strip() and not line.strip().startswith("--")
    ]

    return bool(statements)


def create_sql_migration() -> Path | None:
    MIGRATIONS_PATH.mkdir(parents=True, exist_ok=True)
    VERSIONS_PATH.mkdir(parents=True, exist_ok=True)

    migration_stem = create_migration_stem()
    migration_name = create_migration_name()
    config = Config("alembic.ini")

    _drop_legacy_alembic_version_table()

    before_revision_files = set(VERSIONS_PATH.glob("*.py"))
    command.revision(config, message=migration_name, autogenerate=True)
    after_revision_files = set(VERSIONS_PATH.glob("*.py"))
    generated_revision_files = sorted(after_revision_files - before_revision_files)

    if not generated_revision_files:
        raise RuntimeError("Alembic did not generate a revision file.")

    generated_revision = generated_revision_files[-1]

    try:
        sql_buffer = StringIO()
        config.output_buffer = sql_buffer

        with redirect_stdout(sql_buffer):
            command.upgrade(config, "head", sql=True)

        sql = _strip_alembic_version_sql(sql_buffer.getvalue())

        if not _migration_has_changes(sql):
            return None

        migration_path = MIGRATIONS_PATH / f"{migration_stem}.sql"
        migration_path.write_text(sql, encoding="utf-8")

        return migration_path
    finally:
        generated_revision.unlink(missing_ok=True)


def _drop_legacy_alembic_version_table() -> None:
    with psycopg.connect(_get_psycopg_database_url()) as connection:
        with connection.cursor() as cursor:
            cursor.execute("DROP TABLE IF EXISTS alembic_version")

        connection.commit()


def _get_psycopg_database_url() -> str:
    return get_database_url().replace("postgresql+psycopg://", "postgresql://", 1)


if __name__ == "__main__":
    created_migration = create_sql_migration()

    if created_migration is None:
        print("No database changes detected. SQL migration was not created.")
    else:
        print(f"Created SQL migration: {created_migration}")
