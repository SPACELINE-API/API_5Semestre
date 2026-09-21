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
from app.modules.service_orders.models.invite import (
    INVITE_STATUS_ACEITO,
    INVITE_STATUS_EXPIRADO,
    INVITE_STATUS_PENDENTE,
    INVITE_STATUS_RECUSADO,
    ServiceOrderItemInvite,
)
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_item import (
    STATUS_EM_ANDAMENTO,
    STATUS_PENDENTE,
    ServiceOrderItem,
)
from app.modules.service_orders.services import invite_service as invite_service_module
from app.modules.service_orders.services.invite_service import InviteService
from app.modules.translators.models.translator import Translator
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
    session.query(ServiceOrderItem).delete()
    session.query(ServiceOrder).delete()
    session.query(QuoteTranslationItem).delete()
    session.query(Quote).delete()
    session.query(Translator).delete()
    session.query(Company).delete()

    yield session

    session.close()
    if outer_transaction.is_active:
        outer_transaction.rollback()
    connection.close()


@pytest.fixture
def sent_emails(monkeypatch):
    emails: list[dict] = []

    def fake_send_email(to: str, subject: str, html_body: str) -> None:
        emails.append({"to": to, "subject": subject, "html_body": html_body})

    monkeypatch.setattr(invite_service_module, "send_email", fake_send_email)
    return emails


def make_translator(db_session: Session, email: str | None = None) -> Translator:
    unique_suffix = uuid.uuid4().hex[:10]
    translator = Translator(
        name="Tradutora Teste",
        email=email or f"{unique_suffix}@translators.com",
        phone="11987654321",
    )
    db_session.add(translator)
    db_session.commit()
    db_session.refresh(translator)
    return translator


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


def make_item(db_session: Session) -> ServiceOrderItem:
    company = make_company(db_session)
    quote = Quote(status="approved")
    translation_item = QuoteTranslationItem(
        source_language="pt-BR",
        target_language="en-US",
        estimated_value=Decimal("150.00"),
    )
    quote.items.append(translation_item)
    db_session.add(quote)
    db_session.commit()
    db_session.refresh(translation_item)

    service_order = ServiceOrder(quote_id=quote.id, company_id=company.id, project_name="Projeto")
    item = ServiceOrderItem(
        quote_translation_item_id=translation_item.id,
        source_language="pt-BR",
        target_language="en-US",
        status=STATUS_PENDENTE,
    )
    service_order.items.append(item)
    db_session.add(service_order)
    db_session.commit()
    db_session.refresh(item)
    return item


def test_send_invites_creates_pending_invites_and_sends_email(
    db_session: Session, sent_emails: list[dict]
) -> None:
    item = make_item(db_session)
    translator = make_translator(db_session)
    service = InviteService(db_session)

    invites = service.send_invites(item.id, [translator.id])

    assert len(invites) == 1
    assert invites[0].status == INVITE_STATUS_PENDENTE
    assert len(sent_emails) == 1
    assert sent_emails[0]["to"] == translator.email


def test_accept_invite_assigns_translator_and_expires_other_invites(
    db_session: Session, sent_emails: list[dict]
) -> None:
    item = make_item(db_session)
    translator_a = make_translator(db_session)
    translator_b = make_translator(db_session)
    service = InviteService(db_session)

    invite_a, invite_b = service.send_invites(item.id, [translator_a.id, translator_b.id])

    accepted = service.accept_invite(invite_a.id, translator_a.email)

    assert accepted.status == INVITE_STATUS_ACEITO
    db_session.refresh(item)
    assert item.translator_id == translator_a.id
    assert item.status == STATUS_EM_ANDAMENTO

    db_session.refresh(invite_b)
    assert invite_b.status == INVITE_STATUS_EXPIRADO


def test_accept_invite_with_wrong_email_raises_403(
    db_session: Session, sent_emails: list[dict]
) -> None:
    item = make_item(db_session)
    translator = make_translator(db_session)
    service = InviteService(db_session)

    [invite] = service.send_invites(item.id, [translator.id])

    with pytest.raises(Exception) as exc_info:
        service.accept_invite(invite.id, "outro@email.com")

    assert getattr(exc_info.value, "status_code", None) == 403


def test_decline_invite_sets_status_recusado(db_session: Session, sent_emails: list[dict]) -> None:
    item = make_item(db_session)
    translator = make_translator(db_session)
    service = InviteService(db_session)

    [invite] = service.send_invites(item.id, [translator.id])

    declined = service.decline_invite(invite.id, translator.email)

    assert declined.status == INVITE_STATUS_RECUSADO
