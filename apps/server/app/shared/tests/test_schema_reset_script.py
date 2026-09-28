from pathlib import Path


def test_schema_reset_script_recreates_public_schema() -> None:
    script = Path("scripts/reset_public_schema.py").read_text(encoding="utf-8")

    assert "DROP SCHEMA IF EXISTS public CASCADE" in script
    assert "CREATE SCHEMA public" in script
