from importlib import import_module
from pkgutil import iter_modules

from app import modules

for module in iter_modules(modules.__path__, f"{modules.__name__}."):
    if module.ispkg:
        try:
            import_module(f"{module.name}.models")
        except ModuleNotFoundError as error:
            if error.name != f"{module.name}.models":
                raise
