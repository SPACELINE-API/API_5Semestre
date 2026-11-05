from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.modules.quotes.services.quote_lock import (
    APPROVED_QUOTE_LOCKED_MESSAGE,
    ensure_quote_is_editable,
    ensure_service_order_items_are_editable,
)


def test_approved_quote_is_locked():
    with pytest.raises(HTTPException) as error:
        ensure_quote_is_editable(MagicMock(status="approved"))

    assert error.value.status_code == 409
    assert error.value.detail == APPROVED_QUOTE_LOCKED_MESSAGE


@pytest.mark.parametrize("status", ["pending", "reproved"])
def test_quote_not_approved_is_editable(status):
    ensure_quote_is_editable(MagicMock(status=status))


def test_service_order_from_approved_quote_is_locked():
    service_order = MagicMock(quote=MagicMock(status="approved"))

    with pytest.raises(HTTPException) as error:
        ensure_service_order_items_are_editable(service_order)

    assert error.value.status_code == 409
    assert error.value.detail == APPROVED_QUOTE_LOCKED_MESSAGE


def test_service_order_without_quote_is_editable():
    ensure_service_order_items_are_editable(MagicMock(quote=None))
