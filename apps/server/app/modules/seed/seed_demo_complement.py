"""Additive, repeatable demo data for the commercial workflow.

This seed deliberately does not delete or modify records created by existing seeds.
"""

import random
import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.contacts.models.contact import Contact
from app.modules.quotes.models.quote import Quote
from app.modules.quotes.models.request import Request, StatusEnum
from app.modules.quotes.models.translation_item import QuoteTranslationItem
from app.shared.database import get_session_factory

NAMESPACE = uuid.UUID("7379924a-31f5-4d70-9d83-59a387dc996a")
DATE_ANCHOR = date(2026, 10, 23)


def _id(value: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE, value)


def seed_demo_complement(*, db: Session | None = None) -> list[str]:
    """Create linked company/contact/request/quote examples without destructive actions."""
    session = db or get_session_factory()()
    close_session = db is None
    created: list[str] = []
    date_random = random.Random(20261023)
    try:
        company = session.query(Company).filter_by(cnpj="73482916000100").first()
        if company is None:
            company = Company(
                cnpj="73482916000100",
                legal_name="Alvorada Consultoria Empresarial Ltda",
                trade_name="Alvorada Consultoria",
                is_active=True,
                industry="Consultoria",
                phone="1130552040",
                email="contato@alvoradaconsultoria.com.br",
                zip_code="04538-132",
                street="Rua Fidêncio Ramos",
                number="100",
                neighborhood="Vila Olímpia",
                city="São Paulo",
                state="SP",
            )
            session.add(company)
            session.flush()

        contact_id = _id("contact-alvorada-marina")
        contact = session.get(Contact, contact_id)
        if contact is None:
            contact = Contact(
                id=contact_id,
                company_id=company.id,
                name="Marina Duarte",
                email="marina.duarte@alvoradaconsultoria.com.br",
                phone="(11) 99123-4567",
                department="Comércio Exterior",
            )
            session.add(contact)
        request_id = _id("request-alvorada-marina")
        request = session.get(Request, request_id)
        if request is None:
            request = Request(id=request_id)
            session.add(request)
        request.company_id, request.contact_id = company.id, contact.id
        request.customer_name, request.enterprise, request.email = (
            contact.name,
            company.trade_name,
            contact.email,
        )
        request.original_language, request.translation_language = "pt-BR", "en-US"
        request.customer_need, request.status = (
            "Tradução de relatório comercial",
            StatusEnum.APPROVED,
        )
        request.request_date = date(2026, 10, 1)
        request.approved_at = datetime(2026, 10, 1, 12, tzinfo=UTC)

        quote_id, item_id = _id("quote-alvorada-marina"), _id("item-alvorada-marina")
        quote = session.get(Quote, quote_id)
        if quote is None:
            quote = Quote(id=quote_id)
            session.add(quote)
        quote.request_id, quote.company_id, quote.contact_id = request.id, company.id, contact.id
        quote.status = "pending"
        quote.customer_name, quote.enterprise, quote.email = (
            contact.name,
            company.trade_name,
            contact.email,
        )
        quote.original_language, quote.translation_language = (
            request.original_language,
            request.translation_language,
        )
        quote.customer_need = request.customer_need
        quote.created_at = datetime.combine(
            DATE_ANCHOR - timedelta(days=date_random.randint(0, 180)),
            datetime.min.time(),
            tzinfo=UTC,
        )
        item = session.get(QuoteTranslationItem, item_id)
        if item is None:
            item = QuoteTranslationItem(id=item_id, quote_id=quote.id)
            session.add(item)
        item.quote_id, item.source_language, item.target_language = quote.id, "pt-BR", "en-US"
        item.document_type, item.estimated_value = "Relatório comercial", Decimal("1850.00")
        created.extend([str(company.id), str(contact.id), str(request.id), str(quote.id)])

        # Two distinct requests ensure each quote represents its own workflow.
        scenarios = (
            (
                "eduardo-aprovada",
                "Eduardo Nogueira",
                "eduardo@alvoradaconsultoria.com.br",
                "Comunicação",
                "Tradução de apresentação institucional",
                Decimal("2450.00"),
                "approved",
                None,
            ),
            (
                "camila-reprovada",
                "Camila Freitas",
                "camila@alvoradaconsultoria.com.br",
                "Operações",
                "Tradução de manual técnico",
                Decimal("3120.00"),
                "reproved",
                "O prazo solicitado não é compatível com o cronograma do projeto.",
            ),
            (
                "lucas-aprovada",
                "Lucas Moreira",
                "lucas.moreira@alvoradaconsultoria.com.br",
                "Jurídico",
                "Tradução de contrato de prestação de serviços",
                Decimal("2780.00"),
                "approved",
                None,
            ),
            (
                "beatriz-reprovada",
                "Beatriz Farias",
                "beatriz.farias@alvoradaconsultoria.com.br",
                "Financeiro",
                "Tradução de relatório financeiro",
                Decimal("1960.00"),
                "reproved",
                "O valor estimado ficou acima do orçamento aprovado pelo cliente.",
            ),
            (
                "rodrigo-aprovada",
                "Rodrigo Martins",
                "rodrigo.martins@alvoradaconsultoria.com.br",
                "Marketing",
                "Tradução de catálogo institucional",
                Decimal("3340.00"),
                "approved",
                None,
            ),
            (
                "aline-reprovada",
                "Aline Ribeiro",
                "aline.ribeiro@alvoradaconsultoria.com.br",
                "Recursos Humanos",
                "Tradução de políticas internas",
                Decimal("1420.00"),
                "reproved",
                "A solicitação foi cancelada pelo cliente antes da aprovação comercial.",
            ),
        )
        for _index, (
            scenario,
            name,
            email,
            department,
            need,
            value,
            quote_status,
            reason,
        ) in enumerate(scenarios):
            secondary_contact_id = _id(f"contact-alvorada-{scenario}")
            secondary_contact = session.get(Contact, secondary_contact_id)
            if secondary_contact is None:
                secondary_contact = Contact(
                    id=secondary_contact_id,
                    company_id=company.id,
                    name=name,
                    email=email,
                    phone="(11) 99234-5678",
                    department=department,
                )
                session.add(secondary_contact)
            secondary_request_id = _id(f"request-{scenario}")
            secondary_request = session.get(Request, secondary_request_id)
            if secondary_request is None:
                secondary_request = Request(id=secondary_request_id)
                session.add(secondary_request)
            secondary_request.company_id, secondary_request.contact_id = (
                company.id,
                secondary_contact.id,
            )
            secondary_request.customer_name, secondary_request.enterprise = (
                secondary_contact.name,
                company.trade_name,
            )
            secondary_request.email = secondary_contact.email
            secondary_request.original_language, secondary_request.translation_language = (
                "pt-BR",
                "en-US",
            )
            secondary_request.customer_need = need
            secondary_request.status = StatusEnum.APPROVED
            request_date = DATE_ANCHOR - timedelta(days=date_random.randint(0, 180))
            secondary_request.request_date = request_date
            secondary_request.approved_at = datetime(2026, 10, 2, 12, tzinfo=UTC)
            secondary_request.reproved_at, secondary_request.reproval_reason = None, None
            secondary_quote_id, secondary_item_id = (
                _id(f"quote-{scenario}"),
                _id(f"item-{scenario}"),
            )
            secondary_quote = session.get(Quote, secondary_quote_id)
            if secondary_quote is None:
                secondary_quote = Quote(id=secondary_quote_id)
                session.add(secondary_quote)
            secondary_quote.request_id, secondary_quote.company_id = (
                secondary_request.id,
                company.id,
            )
            secondary_quote.contact_id, secondary_quote.status = secondary_contact.id, quote_status
            secondary_quote.customer_name, secondary_quote.enterprise = (
                secondary_contact.name,
                company.trade_name,
            )
            secondary_quote.email = secondary_contact.email
            secondary_quote.original_language, secondary_quote.translation_language = (
                "pt-BR",
                "en-US",
            )
            secondary_quote.customer_need = need
            secondary_quote.created_at = datetime.combine(
                request_date - timedelta(days=date_random.randint(0, 7)),
                datetime.min.time(),
                tzinfo=UTC,
            )
            secondary_item = session.get(QuoteTranslationItem, secondary_item_id)
            if secondary_item is None:
                secondary_item = QuoteTranslationItem(
                    id=secondary_item_id, quote_id=secondary_quote.id
                )
                session.add(secondary_item)
            secondary_item.quote_id, secondary_item.source_language = secondary_quote.id, "pt-BR"
            secondary_item.target_language, secondary_item.document_type = "en-US", need
            secondary_item.estimated_value = value
            if quote_status == "approved":
                secondary_quote.approved_at = datetime.combine(
                    request_date, datetime.min.time(), tzinfo=UTC
                )
                secondary_quote.reproved_at, secondary_quote.reproval_reason = None, None
            else:
                secondary_quote.reproved_at = datetime.combine(
                    request_date, datetime.min.time(), tzinfo=UTC
                )
                secondary_quote.reproval_reason = reason
            created.extend(
                [str(secondary_contact.id), str(secondary_request.id), str(secondary_quote.id)]
            )

        pending_requests = (
            (
                "pending-request-gabriela",
                "Gabriela Teixeira",
                "gabriela.teixeira@alvoradaconsultoria.com.br",
                "Comércio Exterior",
                "Tradução de proposta de parceria",
            ),
            (
                "pending-request-pedro",
                "Pedro Azevedo",
                "pedro.azevedo@alvoradaconsultoria.com.br",
                "Jurídico",
                "Tradução de aditivo contratual",
            ),
            (
                "pending-request-isabela",
                "Isabela Campos",
                "isabela.campos@alvoradaconsultoria.com.br",
                "Marketing",
                "Tradução de campanha institucional",
            ),
        )
        for key, name, email, department, need in pending_requests:
            pending_contact_id = _id(f"contact-{key}")
            pending_contact = session.get(Contact, pending_contact_id)
            if pending_contact is None:
                pending_contact = Contact(
                    id=pending_contact_id,
                    company_id=company.id,
                    name=name,
                    email=email,
                    phone="(11) 99345-6789",
                    department=department,
                )
                session.add(pending_contact)
            pending_request_id = _id(key)
            pending_request = session.get(Request, pending_request_id)
            if pending_request is None:
                pending_request = Request(id=pending_request_id)
                session.add(pending_request)
            pending_date = DATE_ANCHOR - timedelta(days=date_random.randint(0, 90))
            pending_request.company_id, pending_request.contact_id = company.id, pending_contact.id
            pending_request.customer_name, pending_request.enterprise = name, company.trade_name
            pending_request.email = email
            pending_request.original_language, pending_request.translation_language = (
                "pt-BR",
                "en-US",
            )
            pending_request.customer_need = need
            pending_request.status = StatusEnum.PENDING
            pending_request.request_date = pending_date
            pending_request.approved_at = None
            pending_request.reproved_at = None
            pending_request.reproval_reason = None
            created.extend([str(pending_contact.id), str(pending_request.id)])

        session.commit()
        return created
    except Exception:
        session.rollback()
        raise
    finally:
        if close_session:
            session.close()
