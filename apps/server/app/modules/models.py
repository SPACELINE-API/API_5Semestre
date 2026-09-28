from importlib import import_module
from pathlib import Path

MODULES_PATH = Path(__file__).resolve().parent

for module_path in MODULES_PATH.iterdir():
    if not module_path.is_dir() or module_path.name.startswith("_"):
        continue

    models_path = module_path / "models"
    if not models_path.is_dir():
        continue

    for model_path in models_path.rglob("*.py"):
        if model_path.name.startswith("_"):
            continue

        relative_model = model_path.relative_to(MODULES_PATH).with_suffix("")
        import_module("app.modules." + ".".join(relative_model.parts))
