import sys
from importlib import import_module
from pathlib import Path

SERVER_PATH = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_PATH))

clear_database = import_module("app.modules.seed.database_cleaner").clear_application_tables
get_session_factory = import_module("app.shared.database").get_session_factory


if __name__ == "__main__":
    db = get_session_factory()()
    try:
        clear_database(db)
    finally:
        db.close()

    print("Application tables cleared.")
