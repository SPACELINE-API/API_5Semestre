from datetime import date
from pathlib import Path

from alembic.config import main

VERSIONS_PATH = Path("migrations/versions")


def create_migration_name() -> str:
    existing_migrations = list(VERSIONS_PATH.glob("*.py"))
    next_number = len(existing_migrations) + 1

    return f"migration{next_number} - {date.today().isoformat()}"


if __name__ == "__main__":
    main(["revision", "--autogenerate", "-m", create_migration_name()])
