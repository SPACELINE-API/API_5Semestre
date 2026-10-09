import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.modules.auth.dependencies.dependencies import get_current_user, require_administrator
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser
from app.modules.clients.models.company import Company
from app.modules.quotes.models.quote import Quote
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_email_template import (
    SERVICE_ORDER_EMAIL_TEMPLATE_KEY,
    ServiceOrderEmailTemplate,
)
from app.modules.service_orders.models.service_order_file import ServiceOrderFile
from app.modules.service_orders.models.service_order_item import ServiceOrderItem
from app.modules.service_orders.services import delivery_service as delivery_service_module
from app.shared.database import get_db


def _create_order_with_output_file(
    db_session: Session,
) -> tuple[ServiceOrder, ServiceOrderFile]:
    suffix = uuid.uuid4().hex[:10]
    company = Company(
        legal_name="Empresa de Teste Ltda",
        trade_name="Empresa de Teste",
        cnpj=f"{uuid.uuid4().int % 10**14:014d}",
        industry="juridico",
        phone="11987654321",
        email=f"cliente-{suffix}@example.com",
        zip_code="01310-100",
        street="Avenida Paulista",
        number="1000",
        neighborhood="Bela Vista",
        city="Sao Paulo",
        state="SP",
    )
    db_session.add(company)
    db_session.flush()

    quote = Quote(
        company_id=company.id,
        status="approved",
        customer_name="Maria Teste",
        email=company.email,
    )
    db_session.add(quote)
    db_session.flush()

    order = ServiceOrder(
        quote_id=quote.id,
        company_id=company.id,
        project_name="Projeto de teste da rota",
    )
    db_session.add(order)
    db_session.flush()
    db_session.add(
        ServiceOrderItem(
            service_order_id=order.id,
            source_language="pt-BR",
            target_language="en-US",
            translator_id=None,
        )
    )
    document = ServiceOrderFile(
        service_order_id=order.id,
        filename="traducao-final.pdf",
        file_url=(
            "https://project.supabase.co/storage/v1/object/public/"
            "service-order-files/traduzidos/traducao-final.pdf"
        ),
        storage_path="traduzidos/traducao-final.pdf",
        content_type="application/pdf",
        direction="saida",
        delivery_status="pending",
    )
    db_session.add(document)
    db_session.add(
        ServiceOrderEmailTemplate(
            key=SERVICE_ORDER_EMAIL_TEMPLATE_KEY,
            subject="Tradução concluída",
            body_html="<p>Olá, {{nome_cliente}}!</p>",
        )
    )
    db_session.commit()
    db_session.refresh(order)
    db_session.refresh(document)
    return order, document


def test_send_translated_documents_route_returns_delivery_and_updates_status(
    client: TestClient, isolated_db_session: Session, monkeypatch
) -> None:
    order, document = _create_order_with_output_file(isolated_db_session)
    sent_emails = []
    monkeypatch.setattr(delivery_service_module, "service_order_file_exists", lambda _path: True)
    monkeypatch.setattr(
        delivery_service_module,
        "download_service_order_file",
        lambda _path: b"document bytes",
    )
    monkeypatch.setattr(
        delivery_service_module,
        "send_email",
        lambda **email: sent_emails.append(email),
    )
    app.dependency_overrides[get_db] = lambda: isolated_db_session
    app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
        id=str(uuid.uuid4()), email="operador@example.com"
    )

    try:
        response = client.post(f"/api/service-orders/{order.id}/deliveries")
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["document_file_id"] == str(document.id)
    assert payload[0]["recipient_email"].startswith("cliente-")
    assert payload[0]["status"] == "sent"
    assert sent_emails[0]["attachments"] == [
        ("traducao-final.pdf", b"document bytes", "application/pdf")
    ]
    isolated_db_session.refresh(document)
    assert document.delivery_status == "sent"


def test_send_translated_documents_route_requires_authentication(client: TestClient) -> None:
    response = client.post(f"/api/service-orders/{uuid.uuid4()}/deliveries")

    assert response.status_code == 401


def test_admin_can_preview_and_override_email_for_one_delivery_only(
    client: TestClient, isolated_db_session: Session, monkeypatch
) -> None:
    order, _document = _create_order_with_output_file(isolated_db_session)
    template = isolated_db_session.get(ServiceOrderEmailTemplate, SERVICE_ORDER_EMAIL_TEMPLATE_KEY)
    original_subject = template.subject
    original_body_html = template.body_html
    sent_emails = []
    monkeypatch.setattr(delivery_service_module, "service_order_file_exists", lambda _path: True)
    monkeypatch.setattr(
        delivery_service_module,
        "download_service_order_file",
        lambda _path: b"document bytes",
    )
    monkeypatch.setattr(
        delivery_service_module,
        "send_email",
        lambda **email: sent_emails.append(email),
    )
    app.dependency_overrides[get_db] = lambda: isolated_db_session
    app.dependency_overrides[require_administrator] = lambda: SupabaseAuthenticatedUser(
        id=str(uuid.uuid4()), email="admin@example.com"
    )
    app.dependency_overrides[get_current_user] = lambda: SupabaseAuthenticatedUser(
        id=str(uuid.uuid4()), email="admin@example.com"
    )

    try:
        template_response = client.get("/api/service-orders/email-template")
        delivery_response = client.post(
            f"/api/service-orders/{order.id}/deliveries",
            json={
                "subject_override": "Mensagem editada só para este envio",
                "body_html_override": "<p>Olá, {{nome_cliente}}. Mensagem temporária.</p>",
            },
        )
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(require_administrator, None)
        app.dependency_overrides.pop(get_current_user, None)

    assert template_response.status_code == 200
    assert template_response.json()["subject"] == original_subject
    assert template_response.json()["body_html"] == original_body_html
    assert template_response.json()["available_placeholders"] == ["{{nome_cliente}}"]
    assert delivery_response.status_code == 200
    assert sent_emails[0]["subject"] == "Mensagem editada só para este envio"
    assert sent_emails[0]["html_body"] == "<p>Olá, Maria Teste. Mensagem temporária.</p>"
    isolated_db_session.refresh(template)
    assert template.subject == original_subject
    assert template.body_html == original_body_html
