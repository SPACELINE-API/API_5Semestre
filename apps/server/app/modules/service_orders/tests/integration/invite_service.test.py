import random
import uuid
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.clients.schemas.company import calculate_cnpj_check_digit
from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.translation_item import QuoteTranslationItem
from app.modules.service_orders.models.invite import (
    INVITE_STATUS_ACEITO,
    INVITE_STATUS_EXPIRADO,
    INVITE_STATUS_PENDENTE,
    INVITE_STATUS_RECUSADO,
)
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_email_template import (
    TRANSLATOR_INVITE_EMAIL_TEMPLATE_KEY,
    ServiceOrderEmailTemplate,
)
from app.modules.service_orders.models.service_order_item import (
    STATUS_CONCLUIDA,
    STATUS_EM_ANDAMENTO,
    STATUS_PENDENTE,
    ServiceOrderItem,
)
from app.modules.service_orders.schemas.invite import (
    TranslatorInviteDetailsResponse,
    TranslatorInviteResponse,
)
from app.modules.service_orders.services import invite_service as invite_service_module
from app.modules.service_orders.services.invite_email import DEFAULT_INVITE_SUBJECT
from app.modules.service_orders.services.invite_service import InviteService
from app.modules.translators.models.translator import Translator

_FIRST_DV_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
_SECOND_DV_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]


def generate_valid_cnpj() -> str:
    base = "".join(str(random.randint(0, 9)) for _ in range(12))
    first_dv = calculate_cnpj_check_digit(base, _FIRST_DV_WEIGHTS)
    second_dv = calculate_cnpj_check_digit(base + first_dv, _SECOND_DV_WEIGHTS)
    return base + first_dv + second_dv


@pytest.fixture
def db_session(isolated_db_session):
    return isolated_db_session


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


def test_send_invites_uses_default_email_when_no_template_is_saved(
    db_session: Session, sent_emails: list[dict]
) -> None:
    item = make_item(db_session)
    translator = make_translator(db_session)

    invites = InviteService(db_session).send_invites(item.id, [translator.id])

    email = sent_emails[0]
    assert email["subject"] == DEFAULT_INVITE_SUBJECT
    assert translator.name in email["html_body"]
    assert "pt-BR → en-US" in email["html_body"]
    assert f"/convites/{invites[0].id}" in email["html_body"]
    assert "{{" not in email["html_body"]


def test_send_invites_uses_the_saved_translator_invite_template(
    db_session: Session, sent_emails: list[dict]
) -> None:
    db_session.add(
        ServiceOrderEmailTemplate(
            key=TRANSLATOR_INVITE_EMAIL_TEMPLATE_KEY,
            subject="Convite para {{nome_tradutor}}",
            body_html="<p>{{idioma_origem}} para {{idioma_destino}}: {{link_convite}}</p>",
        )
    )
    db_session.commit()
    item = make_item(db_session)
    translator = make_translator(db_session)

    invites = InviteService(db_session).send_invites(item.id, [translator.id])

    email = sent_emails[0]
    assert email["subject"] == f"Convite para {translator.name}"
    assert email["html_body"].startswith("<p>pt-BR para en-US: ")
    assert f"/convites/{invites[0].id}" in email["html_body"]


def test_send_invites_sends_one_personalized_email_per_translator(
    db_session: Session, sent_emails: list[dict]
) -> None:
    item = make_item(db_session)
    first = make_translator(db_session)
    second = make_translator(db_session)

    InviteService(db_session).send_invites(item.id, [first.id, second.id])

    assert {email["to"] for email in sent_emails} == {first.email, second.email}
    assert len({email["html_body"] for email in sent_emails}) == 2


def test_send_invites_raises_409_when_translator_has_pending_invite(
    db_session: Session, sent_emails: list[dict]
) -> None:
    item = make_item(db_session)
    translator = make_translator(db_session)
    service = InviteService(db_session)

    service.send_invites(item.id, [translator.id])

    with pytest.raises(HTTPException) as exc_info:
        service.send_invites(item.id, [translator.id])

    assert exc_info.value.status_code == 409


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


def test_send_invites_raises_409_when_item_already_has_translator(
    db_session: Session, sent_emails: list[dict]
) -> None:
    item = make_item(db_session)
    translator_a = make_translator(db_session)
    translator_b = make_translator(db_session)
    service = InviteService(db_session)

    (invite_a,) = service.send_invites(item.id, [translator_a.id])
    service.accept_invite(invite_a.id, translator_a.email)

    with pytest.raises(HTTPException) as exc_info:
        service.send_invites(item.id, [translator_b.id])

    assert exc_info.value.status_code == 409


def test_send_invites_allows_same_translator_on_different_items(
    db_session: Session, sent_emails: list[dict]
) -> None:
    item_a = make_item(db_session)
    item_b = make_item(db_session)
    translator = make_translator(db_session)
    service = InviteService(db_session)

    invites_a = service.send_invites(item_a.id, [translator.id])
    invites_b = service.send_invites(item_b.id, [translator.id])

    assert invites_a[0].translator_id == translator.id
    assert invites_b[0].translator_id == translator.id
    assert invites_a[0].id != invites_b[0].id


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


def test_invite_item_status_reflects_service_order_item_status(
    db_session: Session, sent_emails: list[dict]
) -> None:
    item = make_item(db_session)
    translator = make_translator(db_session)
    service = InviteService(db_session)

    [invite] = service.send_invites(item.id, [translator.id])
    assert invite.item_status == STATUS_PENDENTE

    service.accept_invite(invite.id, translator.email)
    db_session.refresh(invite)
    assert invite.item_status == STATUS_EM_ANDAMENTO

    item.status = STATUS_CONCLUIDA
    db_session.commit()
    db_session.refresh(invite)
    assert invite.item_status == STATUS_CONCLUIDA

    invites = service.list_invites_for_translator_email(translator.email)
    assert len(invites) == 1
    assert invites[0].item_status == STATUS_CONCLUIDA


def test_translator_invite_details_expose_only_the_invited_item(
    db_session: Session, sent_emails: list[dict]
) -> None:
    item = make_item(db_session)
    translator = make_translator(db_session)
    service = InviteService(db_session)
    [invite] = service.send_invites(item.id, [translator.id])

    found = service.get_invite_for_translator(invite.id, translator.email.upper())
    response = TranslatorInviteDetailsResponse.model_validate(found).model_dump()

    assert response["item"]["id"] == item.id
    assert response["item"]["status"] == STATUS_PENDENTE
    assert set(response["item"]) == {
        "id",
        "source_language",
        "target_language",
        "document_type",
        "deadline",
        "status",
        "file_url",
        "word_count",
        "price",
    }


def test_translator_cannot_read_another_translators_invite(
    db_session: Session, sent_emails: list[dict]
) -> None:
    item = make_item(db_session)
    translator = make_translator(db_session)
    other_translator = make_translator(db_session)
    service = InviteService(db_session)
    [invite] = service.send_invites(item.id, [translator.id])

    with pytest.raises(HTTPException) as exc_info:
        service.get_invite_for_translator(invite.id, other_translator.email)

    assert exc_info.value.status_code == 403


def test_translator_invite_details_of_unknown_invite_is_404(db_session: Session) -> None:
    with pytest.raises(HTTPException) as exc_info:
        InviteService(db_session).get_invite_for_translator(uuid.uuid4(), "alguem@email.com")

    assert exc_info.value.status_code == 404


def test_list_my_invites_returns_only_own_invites_with_item_summary(
    db_session: Session, sent_emails: list[dict]
) -> None:
    first_item = make_item(db_session)
    second_item = make_item(db_session)
    translator = make_translator(db_session)
    other_translator = make_translator(db_session)
    service = InviteService(db_session)
    service.send_invites(first_item.id, [translator.id])
    service.send_invites(second_item.id, [translator.id, other_translator.id])

    mine = service.list_invites_for_translator_email(translator.email)
    others = service.list_invites_for_translator_email(other_translator.email)
    summary = TranslatorInviteResponse.model_validate(mine[0]).model_dump()["item"]

    assert len(mine) == 2
    assert len(others) == 1
    assert set(summary) == {
        "id",
        "source_language",
        "target_language",
        "document_type",
        "deadline",
        "status",
    }
