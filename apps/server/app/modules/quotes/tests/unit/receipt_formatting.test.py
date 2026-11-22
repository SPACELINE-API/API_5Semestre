import uuid
from datetime import UTC, datetime
from decimal import Decimal

from app.modules.quotes.services.receipt_formatting import (
    format_brl,
    format_cnpj,
    format_datetime_br,
    format_phone,
    short_quote_code,
)


def test_short_quote_code_matches_app_display():
    quote_id = uuid.UUID("3fa85f64-5717-4562-b3fc-2c963f66afa6")

    assert short_quote_code(quote_id) == "3FA85F64"


def test_format_brl_uses_brazilian_separators():
    assert format_brl(Decimal("1240")) == "1.240,00"
    assert format_brl(Decimal("1234567.5")) == "1.234.567,50"
    assert format_brl(Decimal("80.00")) == "80,00"
    assert format_brl(None) == "0,00"


def test_format_datetime_br_converts_utc_to_sao_paulo():
    approved_at = datetime(2026, 11, 3, 21, 14, tzinfo=UTC)

    assert format_datetime_br(approved_at) == "03/11/2026 18:14"


def test_format_datetime_br_handles_missing_value():
    assert format_datetime_br(None) == "-"


def test_format_cnpj_adds_mask_and_keeps_unknown_values():
    assert format_cnpj("28471095000140") == "28.471.095/0001-40"
    assert format_cnpj("28.471.095/0001-40") == "28.471.095/0001-40"
    assert format_cnpj("123") == "123"
    assert format_cnpj(None) is None


def test_format_phone_handles_landline_and_mobile():
    assert format_phone("1198765432") == "(11) 9876-5432"
    assert format_phone("11987654321") == "(11) 98765-4321"
    assert format_phone("(11) 98765-4321") == "(11) 98765-4321"
    assert format_phone("+1 555") == "+1 555"
