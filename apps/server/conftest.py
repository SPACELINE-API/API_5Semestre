import os
import uuid
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.shared.database import Base, get_database_url, get_db

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/postgres",
)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def isolated_db_session():
    """Run DB-backed tests in a temporary schema, preserving the target database."""
    schema_name = f"pytest_{uuid.uuid4().hex}"
    admin_engine = create_engine(get_database_url())

    with admin_engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema_name}"'))

    engine = create_engine(
        get_database_url(),
        connect_args={"options": f"-csearch_path={schema_name}"},
    )
    Base.metadata.create_all(bind=engine)

    connection = engine.connect()
    outer_transaction = connection.begin()
    session = sessionmaker(bind=connection)()
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session, transaction):
        if transaction.nested and not transaction._parent.nested:
            session.begin_nested()

    try:
        yield session
    finally:
        session.close()
        if outer_transaction.is_active:
            outer_transaction.rollback()
        connection.close()
        engine.dispose()
        with admin_engine.begin() as admin_connection:
            admin_connection.execute(text(f'DROP SCHEMA "{schema_name}" CASCADE'))
        admin_engine.dispose()


@pytest.fixture
def mock_db_session():
    session = MagicMock()
    return session


@pytest.fixture
def override_get_db(mock_db_session):
    app.dependency_overrides[get_db] = lambda: mock_db_session
    yield mock_db_session
    app.dependency_overrides.clear()
