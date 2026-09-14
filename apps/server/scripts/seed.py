import sys
from importlib import import_module
from pathlib import Path

SERVER_PATH = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_PATH))

seed_users = import_module("app.modules.seed.seed_users").seed_users


if __name__ == "__main__":
    users = seed_users()

    for email in users:
        print(f"Seeded user: {email}")
