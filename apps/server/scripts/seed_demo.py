"""Populate demo data without resetting application accounts or existing records.

Run from the server directory with ``python scripts/seed_demo.py``.
Unlike ``scripts/seed.py``, this entry point does not call ``seed_users`` or
``clear_application_tables``.
"""

import sys
from pathlib import Path

SERVER_PATH = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_PATH))

import app.modules.models  # noqa: E402, F401
from app.modules.seed.seed_demo_complement import seed_demo_complement  # noqa: E402
from app.modules.seed.seed_demo_operations import seed_demo_operations  # noqa: E402
from app.shared.database import get_session_factory  # noqa: E402

if __name__ == "__main__":
    with get_session_factory()() as db:
        commercial = seed_demo_complement(db=db)
        operational = seed_demo_operations(db=db)

    print(
        "Dados demonstrativos adicionados sem redefinir contas: "
        f"{len(commercial)} registros comerciais e {operational}."
    )
