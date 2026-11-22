import uuid
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.modules.quotes.services.quote_lock import (
    ensure_quote_is_editable,
    ensure_service_order_items_are_editable,
)


def test_draft_quote_is_editable():
    ensure_quote_is_editable(MagicMock(status="draft"))


@pytest.mark.parametrize(
    ("status", "reason"),
    [
        ("pending", "aguardando aprovação"),
        ("approved", "aprovado"),
        ("reproved", "reprovado"),
        ("cancelled", "cancelado"),
    ],
)
def test_locked_quote_explains_reason(status, reason):
    with pytest.raises(HTTPException) as error:
        ensure_quote_is_editable(MagicMock(status=status))

    assert error.value.status_code == 409
    assert reason in error.value.detail
    assert "precisa estar em preparação" in error.value.detail


def test_service_order_without_quote_is_editable():
    ensure_service_order_items_are_editable(MagicMock(quote_id=None))


def test_service_order_linked_to_quote_is_locked():
    with pytest.raises(HTTPException) as error:
        ensure_service_order_items_are_editable(MagicMock(quote_id=uuid.uuid4()))

    assert error.value.status_code == 409
    assert "orçamento vinculado" in error.value.detail
