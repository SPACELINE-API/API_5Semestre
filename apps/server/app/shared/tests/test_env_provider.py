import pytest

from app.shared.EnvProvider import Env, EnvProvider, load_env


def test_env_provider_returns_validated_values() -> None:
    env = Env(
        DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/postgres",
        SERVER_APP_PORT="3333",
        SUPABASE_URL="http://localhost:8000",
    )

    provider = EnvProvider(env)

    assert provider.get_database_url() == (
        "postgresql+psycopg://postgres:postgres@localhost:5432/postgres"
    )
    assert provider.get_server_app_port() == 3333
    assert provider.get_supabase_url() == "http://localhost:8000"
    assert provider.get("database_url") == provider.get_database_url()


def test_env_provider_uses_defaults_for_optional_values() -> None:
    env = Env(DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/postgres")

    provider = EnvProvider(env)

    assert provider.get_server_app_port() == 3333
    assert provider.get_supabase_url() == "http://localhost:8000"
    assert provider.get_supabase_anon_key() == ""


def test_load_env_raises_when_required_env_is_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)

    with pytest.raises(RuntimeError, match="Invalid environment configuration"):
        load_env()
