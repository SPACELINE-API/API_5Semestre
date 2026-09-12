import os
from functools import lru_cache
from typing import Any

from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict, Field, ValidationError

load_dotenv()


class Env(BaseModel):
    model_config = ConfigDict(extra="ignore")

    database_url: str = Field(min_length=1, alias="DATABASE_URL")
    server_app_port: int = Field(default=3333, alias="SERVER_APP_PORT")
    supabase_url: str = Field(default="http://localhost:8000", alias="SUPABASE_URL")
    supabase_anon_key: str = Field(default="", alias="ANON_KEY")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")


env_schema = Env


def load_env() -> Env:
    values = dict(os.environ)

    for key in [
        "SERVER_APP_PORT",
        "SUPABASE_URL",
        "ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
    ]:
        if values.get(key) == "":
            values.pop(key)

    try:
        return Env.model_validate(values)
    except ValidationError as error:
        raise RuntimeError(f"Invalid environment configuration: {error}") from error


class EnvProvider:
    def __init__(self, env: Env | None = None) -> None:
        self.env = env or load_env()

    def get(self, key: str) -> Any:
        return getattr(self.env, key)

    def get_database_url(self) -> str:
        if not self.env.database_url:
            raise RuntimeError("DATABASE_URL is not configured")

        return self.env.database_url

    def get_server_app_port(self) -> int:
        return self.env.server_app_port

    def get_supabase_url(self) -> str:
        return self.env.supabase_url

    def get_supabase_anon_key(self) -> str:
        return self.env.supabase_anon_key

    def get_supabase_service_role_key(self) -> str:
        return self.env.supabase_service_role_key


@lru_cache
def get_env_provider() -> EnvProvider:
    return EnvProvider()


env_provider = get_env_provider()
