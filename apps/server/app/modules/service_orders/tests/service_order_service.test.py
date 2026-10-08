import io
import random
import uuid
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.clients.schemas.company import calculate_cnpj_check_digit
from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.translation_item import QuoteTranslationItem
from app.modules.service_orders.models.service_order_delivery import ServiceOrderDelivery
from app.modules.service_orders.models.service_order_file import ServiceOrderFile
from app.modules.service_orders.models.service_order_item import (
    STATUS_CONCLUIDA,
    STATUS_EM_ANALISE,
    STATUS_EM_ANDAMENTO,
    STATUS_PENDENTE,
    ServiceOrderItem,
)
from app.modules.service_orders.schemas.service_order import (
    CreateServiceOrderItemRequest,
    GenerateServiceOrderRequest,
    UpdateServiceOrderItemRequest,
    UpdateServiceOrderRequest,
)
from app.modules.service_orders.services import (
    service_order_service as service_order_service_module,
)
from app.modules.service_orders.services.service_order_service import (
    ServiceOrderService,
    compute_aggregate_status,
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


def make_order_with_assigned_translator(db_session: Session, company: Company):
    quote = make_quote_with_items(db_session, item_count=1)
    service = ServiceOrderService(db_session)
    order = service.generate_from_quote(
        GenerateServiceOrderRequest(
            quote_id=quote.id,
            company_id=company.id,
            project_name="Ordem com tradutor atribuído",
        )
    )
    translator = Translator(
        name="Tradutor de Entrega",
        email=f"{uuid.uuid4().hex[:10]}@translators.com",
        phone="11987654321",
    )
    db_session.add(translator)
    db_session.flush()
    db_session.query(ServiceOrderItem).filter(ServiceOrderItem.service_order_id == order.id).update(
        {"translator_id": translator.id}, synchronize_session=False
    )
    db_session.commit()
    return service, order


@pytest.fixture
def fake_upload(monkeypatch):
    uploads: list[dict] = []

    def fake_upload_service_order_file(filename, file_data, content_type) -> str:
        uploads.append({"filename": filename, "content_type": content_type})
        return f"https://fake-storage.test/{filename}"

    monkeypatch.setattr(
        service_order_service_module,
        "upload_service_order_file",
        fake_upload_service_order_file,
    )
    return uploads


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


def test_update_service_order_applies_only_provided_fields(db_session: Session) -> None:
    company = make_company(db_session)
    quote = make_quote_with_items(db_session, item_count=1)
    service = ServiceOrderService(db_session)
    created = service.generate_from_quote(
        GenerateServiceOrderRequest(
            quote_id=quote.id,
            company_id=company.id,
            project_name="Projeto original",
        )
    )

    updated = service.update_service_order(
        created.id,
        UpdateServiceOrderRequest(project_name="Projeto renomeado"),
    )

    assert updated.project_name == "Projeto renomeado"
    assert updated.domain_area is None


def test_update_service_order_not_found_raises_404(db_session: Session) -> None:
    service = ServiceOrderService(db_session)

    with pytest.raises(Exception) as exc_info:
        service.update_service_order(uuid.uuid4(), UpdateServiceOrderRequest(project_name="X"))

    assert getattr(exc_info.value, "status_code", None) == 404


def test_add_item_creates_item_without_quote_translation_item(
    db_session: Session, fake_upload
) -> None:
    company = make_company(db_session)
    quote = make_quote_with_items(db_session, item_count=1)
    service = ServiceOrderService(db_session)
    order = service.generate_from_quote(
        GenerateServiceOrderRequest(
            quote_id=quote.id,
            company_id=company.id,
            project_name="Projeto com item extra",
        )
    )

    item = service.add_item(
        order.id,
        CreateServiceOrderItemRequest(
            source_language="pt-BR",
            target_language="en-US",
            document_type="Manual",
            word_count=1200,
            price=Decimal("300.00"),
        ),
        filename="manual.pdf",
        file_data=io.BytesIO(b"conteudo"),
        content_type="application/pdf",
    )

    assert item.service_order_id == order.id
    assert item.quote_translation_item_id is None
    assert item.word_count == 1200
    assert item.file_url == "https://fake-storage.test/manual.pdf"
    assert len(fake_upload) == 1


def test_add_item_not_found_raises_404(db_session: Session) -> None:
    service = ServiceOrderService(db_session)

    with pytest.raises(Exception) as exc_info:
        service.add_item(
            uuid.uuid4(),
            CreateServiceOrderItemRequest(source_language="pt-BR", target_language="en-US"),
        )

    assert getattr(exc_info.value, "status_code", None) == 404


def test_update_item_changes_fields_and_replaces_file(db_session: Session, fake_upload) -> None:
    company = make_company(db_session)
    quote = make_quote_with_items(db_session, item_count=1)
    service = ServiceOrderService(db_session)
    order = service.generate_from_quote(
        GenerateServiceOrderRequest(
            quote_id=quote.id,
            company_id=company.id,
            project_name="Projeto para editar item",
        )
    )
    item_id = order.items[0].id

    updated = service.update_item(
        item_id,
        UpdateServiceOrderItemRequest(
            source_language="es-ES",
            target_language="pt-BR",
            word_count=500,
        ),
        filename="novo.pdf",
        file_data=io.BytesIO(b"conteudo"),
        content_type="application/pdf",
    )

    assert updated.source_language == "es-ES"
    assert updated.target_language == "pt-BR"
    assert updated.word_count == 500
    assert updated.file_url == "https://fake-storage.test/novo.pdf"


def test_update_item_not_found_raises_404(db_session: Session) -> None:
    service = ServiceOrderService(db_session)

    with pytest.raises(Exception) as exc_info:
        service.update_item(
            uuid.uuid4(),
            UpdateServiceOrderItemRequest(source_language="pt-BR", target_language="en-US"),
        )

    assert getattr(exc_info.value, "status_code", None) == 404


def test_add_file_appends_to_service_order(db_session: Session, fake_upload) -> None:
    company = make_company(db_session)
    quote = make_quote_with_items(db_session, item_count=1)
    service = ServiceOrderService(db_session)
    order = service.generate_from_quote(
        GenerateServiceOrderRequest(
            quote_id=quote.id,
            company_id=company.id,
            project_name="Projeto com arquivo",
        )
    )

    file_response = service.add_file(
        order.id,
        filename="entrada.pdf",
        file_data=io.BytesIO(b"conteudo"),
        content_type="application/pdf",
        direction="entrada",
    )

    assert file_response.service_order_id == order.id
    assert file_response.direction == "entrada"
    assert file_response.file_url == "https://fake-storage.test/entrada.pdf"


def test_add_file_saida_raises_409_when_item_missing_translator(
    db_session: Session, fake_upload
) -> None:
    company = make_company(db_session)
    quote = make_quote_with_items(db_session, item_count=2)
    service = ServiceOrderService(db_session)
    order = service.generate_from_quote(
        GenerateServiceOrderRequest(
            quote_id=quote.id,
            company_id=company.id,
            project_name="Projeto sem tradutor",
        )
    )

    with pytest.raises(Exception) as exc_info:
        service.add_file(
            order.id,
            filename="entrega.pdf",
            file_data=io.BytesIO(b"conteudo"),
            content_type="application/pdf",
            direction="saida",
        )

    assert getattr(exc_info.value, "status_code", None) == 409
    assert len(fake_upload) == 0


def test_add_file_saida_marks_items_concluded_when_all_delivered(
    db_session: Session, fake_upload
) -> None:
    company = make_company(db_session)
    quote = make_quote_with_items(db_session, item_count=2)
    service = ServiceOrderService(db_session)
    order = service.generate_from_quote(
        GenerateServiceOrderRequest(
            quote_id=quote.id,
            company_id=company.id,
            project_name="Projeto com tradutores",
        )
    )

    translator = Translator(
        name="Tradutora Teste",
        email=f"{uuid.uuid4().hex[:10]}@translators.com",
        phone="11987654321",
    )
    db_session.add(translator)
    db_session.commit()
    db_session.refresh(translator)

    db_session.query(ServiceOrderItem).filter(ServiceOrderItem.service_order_id == order.id).update(
        {"translator_id": translator.id, "status": STATUS_EM_ANDAMENTO},
        synchronize_session=False,
    )
    db_session.commit()

    service.add_file(
        order.id,
        filename="entrega-1.pdf",
        file_data=io.BytesIO(b"conteudo"),
        content_type="application/pdf",
        direction="saida",
    )
    result = service.add_file(
        order.id,
        filename="entrega-2.pdf",
        file_data=io.BytesIO(b"conteudo"),
        content_type="application/pdf",
        direction="saida",
    )

    assert result.direction == "saida"
    refreshed = service.get_service_order(order.id)
    assert {item.status for item in refreshed.items} == {STATUS_CONCLUIDA}
    assert refreshed.status == STATUS_CONCLUIDA


def test_add_saida_file_persists_storage_reference_metadata_and_delivery_status(
    db_session: Session, monkeypatch
) -> None:
    company = make_company(db_session)
    service, order = make_order_with_assigned_translator(db_session, company)
    monkeypatch.setattr(
        service_order_service_module,
        "upload_service_order_file",
        lambda *_args: (
            "https://project.supabase.co/storage/v1/object/public/"
            "service-order-files/translated/final.pdf"
        ),
    )

    response = service.add_file(
        order.id,
        filename="final.pdf",
        file_data=io.BytesIO(b"traducao"),
        content_type="application/pdf",
        direction="saida",
    )
    document = db_session.get(ServiceOrderFile, response.id)

    assert document is not None
    assert document.storage_path == "translated/final.pdf"
    assert document.content_type == "application/pdf"
    assert document.delivery_status == "pending"


def test_delivery_lookup_selects_only_output_files_and_checks_storage(
    db_session: Session, monkeypatch
) -> None:
    company = make_company(db_session)
    service, order = make_order_with_assigned_translator(db_session, company)
    monkeypatch.setattr(
        service_order_service_module,
        "upload_service_order_file",
        lambda filename, *_args: (
            "https://project.supabase.co/storage/v1/object/public/"
            f"service-order-files/translated/{filename}"
        ),
    )
    service.add_file(
        order.id,
        filename="final.pdf",
        file_data=io.BytesIO(b"traducao"),
        content_type="application/pdf",
        direction="saida",
    )
    service.add_file(
        order.id,
        filename="original.pdf",
        file_data=io.BytesIO(b"original"),
        content_type="application/pdf",
        direction="entrada",
    )
    checked_paths = []
    monkeypatch.setattr(
        service_order_service_module,
        "service_order_file_exists",
        lambda path: checked_paths.append(path) or True,
    )

    documents = service.get_translated_documents_for_delivery(order.id)

    assert [document.filename for document in documents] == ["final.pdf"]
    assert checked_paths == ["translated/final.pdf"]


def test_delivery_lookup_rejects_missing_storage_object(db_session: Session, monkeypatch) -> None:
    company = make_company(db_session)
    service, order = make_order_with_assigned_translator(db_session, company)
    monkeypatch.setattr(
        service_order_service_module,
        "upload_service_order_file",
        lambda *_args: (
            "https://project.supabase.co/storage/v1/object/public/"
            "service-order-files/translated/missing.pdf"
        ),
    )
    service.add_file(
        order.id,
        filename="missing.pdf",
        file_data=io.BytesIO(b"traducao"),
        content_type="application/pdf",
        direction="saida",
    )
    monkeypatch.setattr(
        service_order_service_module, "service_order_file_exists", lambda _path: False
    )

    with pytest.raises(Exception) as exc_info:
        service.get_translated_documents_for_delivery(order.id)

    assert getattr(exc_info.value, "status_code", None) == 404


def test_file_with_delivery_history_cannot_be_deleted(db_session: Session) -> None:
    company = make_company(db_session)
    service, order = make_order_with_assigned_translator(db_session, company)
    document = ServiceOrderFile(
        service_order_id=order.id,
        filename="final.pdf",
        file_url=(
            "https://project.supabase.co/storage/v1/object/public/"
            "service-order-files/translated/final.pdf"
        ),
        storage_path="translated/final.pdf",
        content_type="application/pdf",
        direction="saida",
        delivery_status="failed",
    )
    db_session.add(document)
    db_session.flush()
    db_session.add(
        ServiceOrderDelivery(
            service_order_id=order.id,
            document_file_id=document.id,
            status="failed",
            error_message="Falha SMTP",
        )
    )
    db_session.commit()

    with pytest.raises(Exception) as exc_info:
        service.delete_file(order.id, document.id)

    assert getattr(exc_info.value, "status_code", None) == 409
    assert db_session.get(ServiceOrderFile, document.id) is not None


def test_delete_service_order_removes_it(db_session: Session) -> None:
    company = make_company(db_session)
    quote = make_quote_with_items(db_session, item_count=1)
    service = ServiceOrderService(db_session)
    order = service.generate_from_quote(
        GenerateServiceOrderRequest(
            quote_id=quote.id,
            company_id=company.id,
            project_name="Projeto para deletar",
        )
    )

    service.delete_service_order(order.id)

    with pytest.raises(Exception) as exc_info:
        service.get_service_order(order.id)

    assert getattr(exc_info.value, "status_code", None) == 404


def test_delete_service_order_not_found_raises_404(db_session: Session) -> None:
    service = ServiceOrderService(db_session)

    with pytest.raises(Exception) as exc_info:
        service.delete_service_order(uuid.uuid4())

    assert getattr(exc_info.value, "status_code", None) == 404
