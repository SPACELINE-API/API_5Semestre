import random
import uuid
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.modules.clients.models.company import Company
from app.modules.clients.schemas.company import calculate_cnpj_check_digit
from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.translation_item import QuoteTranslationItem
from app.modules.service_orders.models.invite import ServiceOrderItemInvite
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_item import (
    STATUS_CONCLUIDA,
    STATUS_EM_ANALISE,
    STATUS_EM_ANDAMENTO,
    STATUS_PENDENTE,
)
from app.modules.service_orders.schemas.service_order import GenerateServiceOrderRequest
from app.modules.service_orders.services.service_order_service import (
    ServiceOrderService,
    compute_aggregate_status,
)
from app.shared.database import Base, get_database_url

_FIRST_DV_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
_SECOND_DV_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]


def generate_valid_cnpj() -> str:
    base = "".join(str(random.randint(0, 9)) for _ in range(12))
    first_dv = calculate_cnpj_check_digit(base, _FIRST_DV_WEIGHTS)
    second_dv = calculate_cnpj_check_digit(base + first_dv, _SECOND_DV_WEIGHTS)
    return base + first_dv + second_dv


@pytest.fixture
def db_session():
    engine = create_engine(get_database_url())
    Base.metadata.create_all(bind=engine)

    connection = engine.connect()
    outer_transaction = connection.begin()
    session = sessionmaker(bind=connection)()
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session, transaction):
        if transaction.nested and not transaction._parent.nested:
            session.begin_nested()

    session.query(ServiceOrderItemInvite).delete()
    session.query(ServiceOrder).delete()
    session.query(QuoteTranslationItem).delete()
    session.query(Quote).delete()
    session.query(Company).delete()

    yield session

    session.close()
    if outer_transaction.is_active:
        outer_transaction.rollback()
    connection.close()


def make_company(db_session: Session) -> Company:
    unique_suffix = uuid.uuid4().hex[:10]
    company = Company(
        legal_name="Acme Tecnologia Ltda",
        trade_name="Acme Tech",
        cnpj=generate_valid_cnpj(),
        industry="juridico",
        phone="11987654321",
        email=f"{unique_suffix}@acmetech.com",
        zip_code="01310-100",
        street="Avenida Paulista",
        number="1000",
        neighborhood="Bela Vista",
        city="Sao Paulo",
        state="SP",
    )
    db_session.add(company)
    db_session.commit()
    db_session.refresh(company)
    return company


def make_quote_with_items(db_session: Session, item_count: int = 2) -> Quote:
    quote = Quote(status="approved")
    for index in range(item_count):
        quote.items.append(
            QuoteTranslationItem(
                source_language="pt-BR",
                target_language="en-US",
                document_type="contrato",
                estimated_value=Decimal("100.00") * (index + 1),
            )
        )
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(quote)
    return quote


def test_generate_from_quote_creates_one_item_per_translation_item(db_session: Session) -> None:
    company = make_company(db_session)
    quote = make_quote_with_items(db_session, item_count=3)
    service = ServiceOrderService(db_session)

    response = service.generate_from_quote(
        GenerateServiceOrderRequest(
            quote_id=quote.id,
            company_id=company.id,
            project_name="Projeto Acme",
        )
    )

    assert response.quote_id == quote.id
    assert response.company_id == company.id
    assert len(response.items) == 3
    assert response.status == STATUS_PENDENTE
    assert {item.status for item in response.items} == {STATUS_PENDENTE}


def test_generate_from_quote_without_items_raises_422(db_session: Session) -> None:
    company = make_company(db_session)
    quote = Quote(status="approved")
    db_session.add(quote)
    db_session.commit()
    service = ServiceOrderService(db_session)

    with pytest.raises(Exception) as exc_info:
        service.generate_from_quote(
            GenerateServiceOrderRequest(
                quote_id=quote.id,
                company_id=company.id,
                project_name="Projeto sem itens",
            )
        )

    assert getattr(exc_info.value, "status_code", None) == 422


def test_get_service_order_not_found_raises_404(db_session: Session) -> None:
    service = ServiceOrderService(db_session)

    with pytest.raises(Exception) as exc_info:
        service.get_service_order(uuid.uuid4())

    assert getattr(exc_info.value, "status_code", None) == 404


class _FakeItem:
    def __init__(self, status: str) -> None:
        self.status = status


def test_compute_aggregate_status_pending_when_no_items() -> None:
    assert compute_aggregate_status([]) == STATUS_PENDENTE


def test_compute_aggregate_status_concluded_only_when_all_items_concluded() -> None:
    items = [_FakeItem(STATUS_CONCLUIDA), _FakeItem(STATUS_CONCLUIDA)]
    assert compute_aggregate_status(items) == STATUS_CONCLUIDA


def test_compute_aggregate_status_reflects_most_advanced_pending_stage() -> None:
    items = [_FakeItem(STATUS_CONCLUIDA), _FakeItem(STATUS_EM_ANALISE), _FakeItem(STATUS_PENDENTE)]
    assert compute_aggregate_status(items) == STATUS_EM_ANALISE


def test_compute_aggregate_status_em_andamento_mixed_with_pendente() -> None:
    items = [_FakeItem(STATUS_PENDENTE), _FakeItem(STATUS_EM_ANDAMENTO)]
    assert compute_aggregate_status(items) == STATUS_EM_ANDAMENTO
