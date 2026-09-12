import json
from datetime import datetime
from pathlib import Path

from scripts import create_migration


def test_server_package_exposes_database_migration_commands() -> None:
    package_json = json.loads(Path("package.json").read_text(encoding="utf-8"))

    assert package_json["scripts"]["db:migration:create"] == "python scripts/create_migration.py"
    assert package_json["scripts"]["db:migration:apply"] == "python scripts/apply_migrations.py"


def test_alembic_environment_imports_application_metadata() -> None:
    env_py = Path("migrations/env.py").read_text(encoding="utf-8")

    assert "from app.shared.database import Base, get_database_url" in env_py
    assert "target_metadata = Base.metadata" in env_py
    assert "from app.modules import models as module_models" in env_py
    assert "app.modules.translators.models" not in env_py


def test_module_models_barrel_imports_domain_model_packages() -> None:
    modules_models = Path("app/modules/models.py").read_text(encoding="utf-8")
    translator_models = Path("app/modules/translators/models/__init__.py").read_text(
        encoding="utf-8"
    )

    assert 'import_module(f"{__name__}.{module.name}")' in translator_models
    assert 'import_module(f"{module.name}.models")' in modules_models


def test_create_migration_name_uses_next_number_and_current_date(
    tmp_path: Path, monkeypatch
) -> None:
    migrations_path = tmp_path / "migrations"
    migrations_path.mkdir(parents=True)
    (migrations_path / "migration1_2026_09_12.sql").write_text("", encoding="utf-8")
    (migrations_path / "migration2_2026_09_12.sql").write_text("", encoding="utf-8")
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(
        create_migration,
        "get_current_datetime",
        lambda: datetime(2026, 9, 12, 19, 45),
    )

    migration_name = create_migration.create_migration_name()
    migration_stem = create_migration.create_migration_stem()

    assert migration_name == "migration3_1209_1945"
    assert migration_stem == "migration3_1209_1945"
