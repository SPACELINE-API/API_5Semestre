from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.shared.EnvProvider import env_provider


class Base(DeclarativeBase):
    pass


def get_database_url() -> str:
    database_url = env_provider.get_database_url()

    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)

    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    if database_url.startswith("postgresql+asyncpg://"):
        return database_url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)

    return database_url


@lru_cache
def get_engine() -> Engine:
    engine = create_engine(get_database_url(), pool_pre_ping=True)

    @event.listens_for(engine, "connect")
    def set_sao_paulo_timezone(dbapi_connection: object, _connection_record: object) -> None:
        with dbapi_connection.cursor() as cursor:
            cursor.execute("SET TIME ZONE 'America/Sao_Paulo'")

    return engine


def get_session_factory() -> sessionmaker[Session]:
    return sessionmaker(autocommit=False, autoflush=False, bind=get_engine())


def get_db() -> Generator[Session]:
    db = get_session_factory()()

    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> bool:
    try:
        with get_engine().connect() as connection:
            connection.execute(text("select 1"))
    except Exception:
        return False

    return True
