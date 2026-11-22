import uuid
from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

SAO_PAULO_TIMEZONE = ZoneInfo("America/Sao_Paulo")


def short_quote_code(quote_id: uuid.UUID | str) -> str:
    """Same short code the app shows to users (first 8 chars of the UUID)."""
    return str(quote_id)[:8].upper()


def format_brl(value: Decimal | None) -> str:
    amount = value if value is not None else Decimal("0.00")
    return f"{amount:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")


def format_datetime_br(value: datetime | None) -> str:
    if value is None:
        return "-"
    return value.astimezone(SAO_PAULO_TIMEZONE).strftime("%d/%m/%Y %H:%M")


def _digits(value: str | None) -> str:
    return "".join(char for char in (value or "") if char.isdigit())


def format_cnpj(value: str | None) -> str | None:
    digits = _digits(value)
    if len(digits) != 14:
        return value
    return f"{digits[:2]}.{digits[2:5]}.{digits[5:8]}/{digits[8:12]}-{digits[12:]}"


def format_phone(value: str | None) -> str | None:
    digits = _digits(value)
    if len(digits) == 11:
        return f"({digits[:2]}) {digits[2:7]}-{digits[7:]}"
    if len(digits) == 10:
        return f"({digits[:2]}) {digits[2:6]}-{digits[6:]}"
    return value
