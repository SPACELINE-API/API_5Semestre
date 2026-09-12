from importlib import import_module
from pkgutil import iter_modules

for module in iter_modules(__path__):
    if not module.ispkg and not module.name.startswith("_"):
        import_module(f"{__name__}.{module.name}")
