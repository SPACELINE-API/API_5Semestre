import sys
from importlib import import_module
from pathlib import Path

import psycopg

SERVER_PATH = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_PATH))

get_database_url = import_module("app.shared.database").get_database_url


def reset_public_schema() -> None:
    database_url = get_database_url().replace("postgresql+psycopg://", "postgresql://", 1)

    with psycopg.connect(database_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute("DROP SCHEMA IF EXISTS public CASCADE")
            cursor.execute("CREATE SCHEMA public")

        connection.commit()


if __name__ == "__main__":
    reset_public_schema()
    print("Public schema reset successfully.")
