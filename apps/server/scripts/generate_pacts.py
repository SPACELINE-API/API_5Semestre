"""Regenerate the shared Pact file from every Pact consumer test."""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACT_PATH = ROOT / "pacts" / "web-server.json"
PACT_TESTS = [
    "app/modules/auth/tests/pact_login.test.py",
    "app/modules/quotes/tests/test_translation_items_pact.py",
    "app/modules/quotes/tests/test_quotes_pact.py",
    "app/modules/translators/tests/test_translators_pact.py",
    "app/modules/support_agents/inngest/tests/pact/pact_agent_route.py",
]


def main() -> int:
    PACT_PATH.unlink(missing_ok=True)
    result = subprocess.run([sys.executable, "-m", "pytest", *PACT_TESTS], cwd=ROOT)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
