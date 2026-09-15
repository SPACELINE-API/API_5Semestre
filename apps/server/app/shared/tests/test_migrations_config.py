import json
from pathlib import Path

from scripts.create_migration import create_migration_name


def test_server_package_exposes_database_migration_commands() -> None:
    package_json = json.loads(Path("package.json").read_text(encoding="utf-8"))

    assert package_json["scripts"]["db:migration:create"] == "python scripts/create_migration.py"
    assert package_json["scripts"]["db:migration:apply"] == (
        'python -c "from alembic.config import main; main()" upgrade head'
    )


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
    versions_path = tmp_path / "migrations" / "versions"
    versions_path.mkdir(parents=True)
    (versions_path / "0001_create_users.py").write_text("", encoding="utf-8")
    (versions_path / "0002_create_translators.py").write_text("", encoding="utf-8")
    monkeypatch.chdir(tmp_path)

    migration_name = create_migration_name()

    assert migration_name.startswith("migration3 - ")
