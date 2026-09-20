from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.clients.schemas.company import calculate_cnpj_check_digit
from app.shared.database import get_session_factory

_FIRST_DV_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
_SECOND_DV_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]


def _generate_cnpj(base: str) -> str:
    first_dv = calculate_cnpj_check_digit(base, _FIRST_DV_WEIGHTS)
    second_dv = calculate_cnpj_check_digit(base + first_dv, _SECOND_DV_WEIGHTS)
    return base + first_dv + second_dv


@dataclass(frozen=True)
class SeedCompany:
    legal_name: str
    trade_name: str
    cnpj_base: str
    industry: str
    phone: str
    email: str
    zip_code: str
    street: str
    number: str
    neighborhood: str
    city: str
    state: str
    complement: str | None = None
    is_active: bool = True


SEED_COMPANIES = [
    SeedCompany(
        legal_name="Traduzir Idiomas e Servicos Ltda",
        trade_name="Traduzir Idiomas",
        cnpj_base="110293840001",
        industry="Traducao",
        phone="1133224455",
        email="contato@traduziridiomas.com.br",
        zip_code="20040-020",
        street="Rua da Assembleia",
        number="50",
        neighborhood="Centro",
        city="Rio de Janeiro",
        state="RJ",
    ),
    SeedCompany(
        legal_name="Rezende Advogados Associados Ltda",
        trade_name="Rezende Advogados",
        cnpj_base="284710950001",
        industry="Juridico",
        phone="1198765432",
        email="contato@rezendeadv.com.br",
        zip_code="01310-100",
        street="Avenida Paulista",
        number="1000",
        complement="Sala 202",
        neighborhood="Bela Vista",
        city="Sao Paulo",
        state="SP",
    ),
    SeedCompany(
        legal_name="Construtora Horizonte S.A.",
        trade_name="Horizonte Engenharia",
        cnpj_base="356189020001",
        industry="Construcao Civil",
        phone="4132198765",
        email="contato@horizonteengenharia.com.br",
        zip_code="80010-000",
        street="Rua XV de Novembro",
        number="300",
        neighborhood="Centro",
        city="Curitiba",
        state="PR",
    ),
    SeedCompany(
        legal_name="Studio Criativo Design Ltda",
        trade_name="Studio Criativo",
        cnpj_base="472635810001",
        industry="Design",
        phone="5133445566",
        email="hello@studiocriativo.com.br",
        zip_code="90010-150",
        street="Rua dos Andradas",
        number="1234",
        neighborhood="Centro Historico",
        city="Porto Alegre",
        state="RS",
    ),
    SeedCompany(
        legal_name="Global Servicos de Traducao Ltda",
        trade_name="Global Traducoes",
        cnpj_base="509827160001",
        industry="Traducao",
        phone="8532104477",
        email="atendimento@globaltraducoes.com.br",
        zip_code="60160-230",
        street="Avenida Beira Mar",
        number="450",
        neighborhood="Meireles",
        city="Fortaleza",
        state="CE",
        is_active=False,
    ),
    SeedCompany(
        legal_name="Nexus Tecnologia da Informacao Ltda",
        trade_name="Nexus Tech",
        cnpj_base="618374290001",
        industry="Tecnologia",
        phone="6132234455",
        email="contato@nexustech.com.br",
        zip_code="70040-020",
        street="Setor Comercial Sul",
        number="88",
        neighborhood="Asa Sul",
        city="Brasilia",
        state="DF",
    ),
]


def seed_companies(*, db: Session | None = None) -> list[str]:
    database_session = db or get_session_factory()()
    should_close_session = db is None

    try:
        database_session.query(Company).delete()
        seeded_names = []

        for seed_company in SEED_COMPANIES:
            company = Company(
                legal_name=seed_company.legal_name,
                trade_name=seed_company.trade_name,
                cnpj=_generate_cnpj(seed_company.cnpj_base),
                is_active=seed_company.is_active,
                industry=seed_company.industry,
                phone=seed_company.phone,
                email=seed_company.email,
                zip_code=seed_company.zip_code,
                street=seed_company.street,
                number=seed_company.number,
                complement=seed_company.complement,
                neighborhood=seed_company.neighborhood,
                city=seed_company.city,
                state=seed_company.state,
            )
            database_session.add(company)
            seeded_names.append(seed_company.trade_name)

        database_session.commit()

        return seeded_names
    finally:
        if should_close_session:
            database_session.close()
