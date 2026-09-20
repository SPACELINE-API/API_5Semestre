import random

import pytest
from pydantic import ValidationError

from app.modules.clients.schemas.company import (
    CompanyCreate,
    calculate_cnpj_check_digit,
    is_valid_cnpj,
)

_FIRST_DV_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
_SECOND_DV_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]


def build_cnpj(base: str) -> str:
    first_dv = calculate_cnpj_check_digit(base, _FIRST_DV_WEIGHTS)
    second_dv = calculate_cnpj_check_digit(base + first_dv, _SECOND_DV_WEIGHTS)
    return base + first_dv + second_dv


def random_numeric_base() -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(12))


def base_company_kwargs(**overrides) -> dict:
    data = {
        "legal_name": "Acme Tecnologia Ltda",
        "trade_name": "Acme Tech",
        "cnpj": build_cnpj(random_numeric_base()),
        "industry": "juridico",
        "phone": "11987654321",
        "email": "contato@acmetech.com",
        "zip_code": "01310-100",
        "street": "Avenida Paulista",
        "number": "1000",
        "neighborhood": "Bela Vista",
        "city": "Sao Paulo",
        "state": "SP",
    }
    data.update(overrides)
    return data


def test_is_valid_cnpj_accepts_real_numeric_cnpj() -> None:
    cnpj = build_cnpj(random_numeric_base())

    assert is_valid_cnpj(cnpj) is True


def test_is_valid_cnpj_accepts_masked_numeric_cnpj() -> None:
    raw = build_cnpj(random_numeric_base())
    masked = f"{raw[:2]}.{raw[2:5]}.{raw[5:8]}/{raw[8:12]}-{raw[12:]}"

    assert is_valid_cnpj(masked) is True


def test_is_valid_cnpj_accepts_alphanumeric_cnpj() -> None:
    base = "AB" + "".join(str(random.randint(0, 9)) for _ in range(10))
    cnpj = build_cnpj(base)

    assert is_valid_cnpj(cnpj) is True


def test_is_valid_cnpj_rejects_wrong_check_digits() -> None:
    base = random_numeric_base()
    valid_cnpj = build_cnpj(base)
    tampered = valid_cnpj[:12] + "00"

    assert is_valid_cnpj(tampered) is False


def test_is_valid_cnpj_rejects_letters_in_check_digits() -> None:
    base = random_numeric_base()
    cnpj = base + "AB"

    assert is_valid_cnpj(cnpj) is False


def test_is_valid_cnpj_rejects_wrong_length() -> None:
    assert is_valid_cnpj("123456789") is False


def test_company_create_accepts_valid_cnpj() -> None:
    company = CompanyCreate(**base_company_kwargs())

    assert company.cnpj is not None


def test_company_create_rejects_invalid_cnpj() -> None:
    with pytest.raises(ValidationError):
        CompanyCreate(**base_company_kwargs(cnpj="11111111111111"))
