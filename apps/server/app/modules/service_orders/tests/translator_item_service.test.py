import random
import uuid

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.clients.schemas.company import calculate_cnpj_check_digit
from app.modules.quotes.models.quote import Quote
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_file import (
    DIRECTION_ENTRADA,
    DIRECTION_SAIDA,
    ServiceOrderFile,
)
from app.modules.service_orders.models.service_order_item import (
    STATUS_CONCLUIDA,
    STATUS_EM_ANDAMENTO,
    ServiceOrderItem,
)
from app.modules.service_orders.services.translator_item_service import (
    DELIVERY_MAX_BYTES,
    TranslatorItemService,
    validate_delivery_file,
)
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


def make_translator(db_session: Session) -> Translator:
    translator = Translator(
        name="Tradutora Teste",
        email=f"{uuid.uuid4().hex[:10]}@translators.com",
        phone="11987654321",
    )
    db_session.add(translator)
    db_session.commit()
    return translator


def make_service_order(db_session: Session, statuses_and_translators: list) -> ServiceOrder:
    company = Company(
        legal_name="Acme Tecnologia Ltda",
        trade_name="Acme Tech",
        cnpj=generate_valid_cnpj(),
        industry="juridico",
        phone="11987654321",
        email=f"{uuid.uuid4().hex[:10]}@acmetech.com",
        zip_code="01310-100",
        street="Avenida Paulista",
        number="1000",
        neighborhood="Bela Vista",
        city="Sao Paulo",
        state="SP",
    )
    db_session.add(company)
    quote = Quote(status="approved")
    db_session.add(quote)
    db_session.commit()

    service_order = ServiceOrder(quote_id=quote.id, company_id=company.id, project_name="Projeto")
    for status, translator in statuses_and_translators:
        service_order.items.append(
            ServiceOrderItem(
                source_language="pt-BR",
                target_language="en-US",
                status=status,
                translator_id=translator.id if translator else None,
            )
        )
    db_session.add(service_order)
    db_session.commit()
    return service_order


def test_list_items_returns_only_items_assigned_to_the_translator(db_session: Session) -> None:
    translator = make_translator(db_session)
    other_translator = make_translator(db_session)
    make_service_order(
        db_session,
        [
            (STATUS_EM_ANDAMENTO, translator),
            (STATUS_EM_ANDAMENTO, other_translator),
            (STATUS_EM_ANDAMENTO, None),
        ],
    )

    mine = TranslatorItemService(db_session).list_items(translator.email.upper())

    assert len(mine) == 1
    assert mine[0].status == STATUS_EM_ANDAMENTO
    assert mine[0].delivered_files == []


def test_delivered_files_only_include_this_items_deliveries(db_session: Session) -> None:
    translator = make_translator(db_session)
    service_order = make_service_order(
        db_session,
        [(STATUS_EM_ANDAMENTO, translator), (STATUS_EM_ANDAMENTO, translator)],
    )
    first_item, second_item = service_order.items
    db_session.add_all(
        [
            ServiceOrderFile(
                service_order_id=service_order.id,
                service_order_item_id=first_item.id,
                filename="traducao-1.pdf",
                file_url="https://storage.example/traducao-1.pdf",
                direction=DIRECTION_SAIDA,
            ),
            ServiceOrderFile(
                service_order_id=service_order.id,
                service_order_item_id=second_item.id,
                filename="traducao-2.pdf",
                file_url="https://storage.example/traducao-2.pdf",
                direction=DIRECTION_SAIDA,
            ),
            ServiceOrderFile(
                service_order_id=service_order.id,
                service_order_item_id=first_item.id,
                filename="original.pdf",
                file_url="https://storage.example/original.pdf",
                direction=DIRECTION_ENTRADA,
            ),
        ]
    )
    db_session.commit()

    item = TranslatorItemService(db_session).get_item(first_item.id, translator.email)

    assert [file.filename for file in item.delivered_files] == ["traducao-1.pdf"]


def test_get_item_assigned_to_another_translator_is_403(db_session: Session) -> None:
    translator = make_translator(db_session)
    other_translator = make_translator(db_session)
    service_order = make_service_order(db_session, [(STATUS_EM_ANDAMENTO, other_translator)])

    with pytest.raises(HTTPException) as error:
        TranslatorItemService(db_session).get_item(service_order.items[0].id, translator.email)

    assert error.value.status_code == 403


def test_unknown_item_and_unknown_translator_are_404(db_session: Session) -> None:
    translator = make_translator(db_session)
    service = TranslatorItemService(db_session)

    with pytest.raises(HTTPException) as unknown_item:
        service.get_item(uuid.uuid4(), translator.email)

    with pytest.raises(HTTPException) as unknown_translator:
        service.list_items("ninguem@translators.com")

    assert unknown_item.value.status_code == 404
    assert unknown_translator.value.status_code == 404


def test_delivery_to_another_translators_item_is_403(db_session: Session) -> None:
    translator = make_translator(db_session)
    other_translator = make_translator(db_session)
    service_order = make_service_order(db_session, [(STATUS_EM_ANDAMENTO, other_translator)])

    with pytest.raises(HTTPException) as error:
        TranslatorItemService(db_session).deliver(
            service_order.items[0].id, translator.email, "traducao.pdf", b"%PDF-1.7", "x/y"
        )

    assert error.value.status_code == 403
    assert db_session.query(ServiceOrderFile).count() == 0


def test_delivery_to_concluded_item_is_409(db_session: Session) -> None:
    translator = make_translator(db_session)
    service_order = make_service_order(db_session, [(STATUS_CONCLUIDA, translator)])

    with pytest.raises(HTTPException) as error:
        TranslatorItemService(db_session).deliver(
            service_order.items[0].id, translator.email, "traducao.pdf", b"%PDF-1.7", "x/y"
        )

    assert error.value.status_code == 409


@pytest.mark.parametrize(
    ("filename", "content", "expected_status"),
    [
        pytest.param("traducao.pdf", b"", 422, id="vazio"),
        pytest.param("programa.exe", b"conteudo", 422, id="extensao-invalida"),
        pytest.param("sem-extensao", b"conteudo", 422, id="sem-extensao"),
        pytest.param("grande.pdf", b"0" * (DELIVERY_MAX_BYTES + 1), 413, id="acima-do-limite"),
    ],
)
def test_invalid_delivery_is_rejected_before_anything_is_stored(
    db_session: Session, filename: str, content: bytes, expected_status: int
) -> None:
    translator = make_translator(db_session)
    service_order = make_service_order(db_session, [(STATUS_EM_ANDAMENTO, translator)])

    with pytest.raises(HTTPException) as error:
        TranslatorItemService(db_session).deliver(
            service_order.items[0].id, translator.email, filename, content, "x/y"
        )

    assert error.value.status_code == expected_status
    assert db_session.query(ServiceOrderFile).count() == 0
    assert service_order.items[0].status == STATUS_EM_ANDAMENTO


@pytest.mark.parametrize("filename", ["traducao.pdf", "traducao.DOCX", "foto.jpeg"])
def test_validate_delivery_file_accepts_documents_and_images(filename: str) -> None:
    validate_delivery_file(filename, b"conteudo")
