from app.modules.service_orders.models.service_order_item import (
    STATUS_CONCLUIDA,
    STATUS_EM_ANALISE,
    STATUS_EM_ANDAMENTO,
    STATUS_PENDENTE,
)
from app.modules.service_orders.services.service_order_service import (
    compute_aggregate_status,
)


class _FakeItem:
    def __init__(self, status: str) -> None:
        self.status = status


def test_compute_aggregate_status_pending_when_no_items() -> None:
    assert compute_aggregate_status([]) == STATUS_PENDENTE


def test_compute_aggregate_status_concluded_only_when_all_items_concluded() -> None:
    items = [_FakeItem(STATUS_CONCLUIDA), _FakeItem(STATUS_CONCLUIDA)]
    assert compute_aggregate_status(items) == STATUS_CONCLUIDA


def test_compute_aggregate_status_reflects_most_advanced_pending_stage() -> None:
    items = [
        _FakeItem(STATUS_CONCLUIDA),
        _FakeItem(STATUS_EM_ANALISE),
        _FakeItem(STATUS_PENDENTE),
    ]
    assert compute_aggregate_status(items) == STATUS_EM_ANALISE


def test_compute_aggregate_status_em_andamento_mixed_with_pendente() -> None:
    items = [_FakeItem(STATUS_PENDENTE), _FakeItem(STATUS_EM_ANDAMENTO)]
    assert compute_aggregate_status(items) == STATUS_EM_ANDAMENTO
