import random
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from importlib import import_module

from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.quotes.models.quote import Quote
from app.modules.seed.seed_companies import _generate_cnpj
from app.modules.service_orders.models.service_order import ServiceOrder
from app.modules.service_orders.models.service_order_file import (
    DIRECTION_SAIDA,
    ServiceOrderFile,
)
from app.modules.service_orders.models.service_order_item import (
    STATUS_CONCLUIDA,
    STATUS_EM_ANALISE,
    STATUS_EM_ANDAMENTO,
    STATUS_PENDENTE,
    ServiceOrderItem,
)
from app.modules.translators.models.translator import Translator
from app.shared.database import get_session_factory

RANDOM_SEED = 20261016
COMPLETED_ITEMS = 44
HISTORY_DAYS = 55
SEED_FILE_BASE_URL = "https://example.com/seed"
SEED_COMPANY_TRADE_NAME = "Traduzir Idiomas"

SEED_PROJECTS = [
    (uuid.UUID("c0c0c0c0-0000-4000-8000-000000000001"), "Contrato societário Acme"),
    (uuid.UUID("c0c0c0c0-0000-4000-8000-000000000002"), "Manual técnico Orbital"),
    (uuid.UUID("c0c0c0c0-0000-4000-8000-000000000003"), "Documentação financeira Nova Bank"),
    (uuid.UUID("c0c0c0c0-0000-4000-8000-000000000004"), "Material institucional Lume"),
]
SEED_ORDER_IDS = [project_id for project_id, _ in SEED_PROJECTS]

SEED_PRODUCTIVITY_TRANSLATORS = [
    (
        uuid.UUID("a1a2a3a4-0000-4000-8000-000000000001"),
        "Operador Tradutor",
        "operador@spaceline.com.br",
        "11988887777",
        3,
    ),
    (
        uuid.UUID("a1a2a3a4-0000-4000-8000-000000000002"),
        "Camila Tradutora",
        "camila.tradutora@spaceline.com.br",
        "11977776666",
        6,
    ),
    (
        uuid.UUID("a1a2a3a4-0000-4000-8000-000000000010"),
        "Rafael Mendes",
        "rafael.mendes@spaceline.com.br",
        "11966665555",
        5,
    ),
    (
        uuid.UUID("a1a2a3a4-0000-4000-8000-000000000011"),
        "Beatriz Lima",
        "beatriz.lima@spaceline.com.br",
        "11955554444",
        4,
    ),
    (
        uuid.UUID("a1a2a3a4-0000-4000-8000-000000000012"),
        "Thiago Alves",
        "thiago.alves@spaceline.com.br",
        "11944443333",
        2,
    ),
    (
        uuid.UUID("a1a2a3a4-0000-4000-8000-000000000013"),
        "Juliana Costa",
        "juliana.costa@spaceline.com.br",
        "11933332222",
        3,
    ),
]

LANGUAGE_PAIRS = [
    ("pt-BR", "en-US"),
    ("en-US", "pt-BR"),
    ("pt-BR", "es-ES"),
    ("es-ES", "pt-BR"),
    ("pt-BR", "fr-FR"),
    ("de-DE", "pt-BR"),
]
DOCUMENT_TYPES = [
    "Contrato societário",
    "Certidão de nascimento",
    "Balanço patrimonial",
    "Manual técnico",
    "Laudo médico",
    "Procuração",
    "Apresentação institucional",
]
IN_PROGRESS_STATUSES = [STATUS_PENDENTE, STATUS_EM_ANDAMENTO, STATUS_EM_ANALISE]


def _load_models() -> None:
    import_module("app.modules.models")


def clear_productivity_seed(*, db: Session | None = None) -> None:
    _load_models()
    database_session = db or get_session_factory()()
    should_close_session = db is None

    try:
        for order in (
            database_session.query(ServiceOrder).filter(ServiceOrder.id.in_(SEED_ORDER_IDS)).all()
        ):
            quote_id = order.quote_id
            database_session.delete(order)
            database_session.flush()
            quote = database_session.get(Quote, quote_id)
            if quote is not None:
                database_session.delete(quote)
        database_session.commit()
    finally:
        if should_close_session:
            database_session.close()


def _get_or_create_company(database_session: Session) -> Company:
    company = (
        database_session.query(Company)
        .filter(Company.trade_name == SEED_COMPANY_TRADE_NAME)
        .first()
    ) or database_session.query(Company).first()
    if company is not None:
        return company

    company = Company(
        legal_name="Traduzir Idiomas e Servicos Ltda",
        trade_name=SEED_COMPANY_TRADE_NAME,
        cnpj=_generate_cnpj("110293840001"),
        industry="Traducao",
        phone="1133224455",
        email="contato@traduziridiomas.com.br",
        zip_code="20040-020",
        street="Rua da Assembleia",
        number="50",
        neighborhood="Centro",
        city="Rio de Janeiro",
        state="RJ",
    )
    database_session.add(company)
    database_session.flush()
    return company


def _ensure_translators(database_session: Session) -> list[tuple[Translator, int]]:
    translators: list[tuple[Translator, int]] = []
    for translator_id, name, email, phone, weight in SEED_PRODUCTIVITY_TRANSLATORS:
        translator = database_session.get(Translator, translator_id)
        if translator is None:
            translator = Translator(id=translator_id, name=name, email=email, phone=phone)
            database_session.add(translator)
        translators.append((translator, weight))
    database_session.flush()
    return translators


def seed_productivity(*, db: Session | None = None) -> list[str]:
    _load_models()
    database_session = db or get_session_factory()()
    should_close_session = db is None

    try:
        clear_productivity_seed(db=database_session)

        company = _get_or_create_company(database_session)
        translators = _ensure_translators(database_session)
        weighted_translators = [
            translator for translator, weight in translators for _ in range(weight)
        ]

        orders: list[ServiceOrder] = []
        for order_id, project_name in SEED_PROJECTS:
            quote = Quote(
                id=uuid.uuid4(),
                company_id=company.id,
                status="approved",
                customer_name=company.trade_name,
            )
            database_session.add(quote)
            database_session.flush()
            order = ServiceOrder(
                id=order_id,
                quote_id=quote.id,
                company_id=company.id,
                project_name=project_name,
            )
            database_session.add(order)
            orders.append(order)
        database_session.flush()

        generator = random.Random(RANDOM_SEED)
        now = datetime.now(UTC)
        item_count = 0

        for index in range(COMPLETED_ITEMS):
            order = generator.choice(orders)
            translator = generator.choice(weighted_translators)
            source_language, target_language = generator.choice(LANGUAGE_PAIRS)
            document_type = generator.choice(DOCUMENT_TYPES)
            words = generator.randint(180, 4800)
            price = (Decimal(words) * Decimal(generator.randint(18, 42)) / Decimal(100)).quantize(
                Decimal("0.01")
            )
            completed_at = now - timedelta(
                days=generator.randint(0, HISTORY_DAYS), hours=generator.randint(0, 9)
            )
            created_at = completed_at - timedelta(days=generator.randint(2, 9))
            is_late = generator.random() < 0.25
            deadline = completed_at + (
                timedelta(days=-generator.randint(1, 4))
                if is_late
                else timedelta(days=generator.randint(1, 6))
            )

            item = ServiceOrderItem(
                service_order_id=order.id,
                translator_id=translator.id,
                source_language=source_language,
                target_language=target_language,
                document_type=document_type,
                file_url=f"{SEED_FILE_BASE_URL}/original-{index + 1}.pdf",
                word_count=words,
                price=price,
                deadline=deadline,
                status=STATUS_CONCLUIDA,
                completed_at=completed_at,
                created_at=created_at,
                updated_at=completed_at,
            )
            database_session.add(item)
            database_session.flush()
            database_session.add(
                ServiceOrderFile(
                    service_order_id=order.id,
                    service_order_item_id=item.id,
                    filename=f"traducao-{index + 1}.pdf",
                    file_url=f"{SEED_FILE_BASE_URL}/traducao-{index + 1}.pdf",
                    content_type="application/pdf",
                    direction=DIRECTION_SAIDA,
                    delivery_status="sent",
                    uploaded_at=completed_at,
                )
            )
            item_count += 1

        for status in IN_PROGRESS_STATUSES:
            translator = generator.choice(weighted_translators)
            order = generator.choice(orders)
            database_session.add(
                ServiceOrderItem(
                    service_order_id=order.id,
                    translator_id=translator.id,
                    source_language="pt-BR",
                    target_language="en-US",
                    document_type=generator.choice(DOCUMENT_TYPES),
                    word_count=generator.randint(300, 2000),
                    price=Decimal("250.00"),
                    deadline=now + timedelta(days=generator.randint(2, 12)),
                    status=status,
                )
            )

        database_session.commit()

        return [f"{item_count} documentos concluídos em {len(orders)} projetos"]
    finally:
        if should_close_session:
            database_session.close()
