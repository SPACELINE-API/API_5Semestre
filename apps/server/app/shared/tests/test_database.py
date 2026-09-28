import pytest

from app.shared import database
from app.shared.EnvProvider import Env, EnvProvider


def set_database_url(monkeypatch: pytest.MonkeyPatch, database_url: str) -> None:
    env = Env(DATABASE_URL=database_url)
    monkeypatch.setattr(database, "env_provider", EnvProvider(env))


def test_get_database_url_requires_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    env = Env(DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/postgres")
    provider = EnvProvider(env)
    monkeypatch.setattr(database, "env_provider", provider)
    provider.env.database_url = ""

    with pytest.raises(RuntimeError, match="DATABASE_URL is not configured"):
        provider.get_database_url()


def test_get_database_url_uses_psycopg_driver_for_postgres_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    set_database_url(monkeypatch, "postgres://user:pass@localhost:5432/postgres")

    assert database.get_database_url() == "postgresql+psycopg://user:pass@localhost:5432/postgres"


def test_get_database_url_uses_psycopg_driver_for_postgresql_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    set_database_url(monkeypatch, "postgresql://user:pass@localhost:5432/postgres")

    assert database.get_database_url() == "postgresql+psycopg://user:pass@localhost:5432/postgres"


def test_get_database_url_keeps_explicit_driver_url(monkeypatch: pytest.MonkeyPatch) -> None:
    set_database_url(monkeypatch, "postgresql+psycopg://user:pass@localhost:5432/postgres")

    assert database.get_database_url() == "postgresql+psycopg://user:pass@localhost:5432/postgres"


def test_get_database_url_uses_psycopg_driver_for_asyncpg_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    set_database_url(monkeypatch, "postgresql+asyncpg://user:pass@localhost:5432/postgres")

    assert database.get_database_url() == "postgresql+psycopg://user:pass@localhost:5432/postgres"
