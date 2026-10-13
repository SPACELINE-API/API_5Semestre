from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.auth.dependencies.dependencies import get_current_user, require_permission
from app.modules.auth.schemas.supabase import SupabaseAuthenticatedUser

client = TestClient(app)

PROPOSALS_URL = "/api/quotes/proposals"


def _authenticated_user():
    return SupabaseAuthenticatedUser(id="user-id", email="user@example.com")


@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[require_permission("proposals:read")] = _authenticated_user
    yield
    app.dependency_overrides.pop(require_permission("proposals:read"), None)


def _make_proposal_mock(status: str = "pending"):
    proposal = MagicMock()
    proposal.id = "123e4567-e89b-12d3-a456-426614174000"
    proposal.customer_name = "Acme Corp"
    proposal.enterprise = "Acme"
    proposal.original_language = "pt-BR"
    proposal.translation_language = "en-US"
    proposal.customer_need = "Contrato"
    proposal.total_value = Decimal("500.00")
    proposal.status = status
    proposal.created_at = "2026-01-15T10:00:00Z"
    proposal.updated_at = "2026-01-15T10:00:00Z"
    return proposal


def test_list_proposals_returns_200_with_valid_auth():
    with patch("app.modules.quotes.routes.QuoteService") as MockService:
        instance = MockService.return_value
        instance.list_proposals.return_value = {
            "items": [],
            "total": 0,
            "page": 1,
            "page_size": 10,
            "total_pages": 0,
        }

        response = client.get(PROPOSALS_URL)

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] == 0


def test_list_proposals_without_auth_returns_403():
    app.dependency_overrides.pop(require_permission("proposals:read"), None)
    app.dependency_overrides[get_current_user] = lambda: (_ for _ in ()).throw(
        __import__("fastapi").HTTPException(status_code=403)
    )

    response = client.get(PROPOSALS_URL)

    app.dependency_overrides.pop(get_current_user, None)
    assert response.status_code in (401, 403)


def test_list_proposals_filters_by_status():
    with patch("app.modules.quotes.routes.QuoteService") as MockService:
        instance = MockService.return_value
        instance.list_proposals.return_value = {
            "items": [],
            "total": 0,
            "page": 1,
            "page_size": 10,
            "total_pages": 0,
        }

        response = client.get(PROPOSALS_URL, params={"status": "approved"})

        assert response.status_code == 200
        call_kwargs = instance.list_proposals.call_args.kwargs
        assert call_kwargs["status_filter"] == "approved"


def test_list_proposals_rejects_invalid_status():
    response = client.get(PROPOSALS_URL, params={"status": "invalid"})
    assert response.status_code == 422


def test_list_proposals_filters_by_date_range():
    with patch("app.modules.quotes.routes.QuoteService") as MockService:
        instance = MockService.return_value
        instance.list_proposals.return_value = {
            "items": [],
            "total": 0,
            "page": 1,
            "page_size": 10,
            "total_pages": 0,
        }

        response = client.get(
            PROPOSALS_URL,
            params={"start_date": "2026-01-01", "end_date": "2026-12-31"},
        )

        assert response.status_code == 200
        from datetime import date

        call_kwargs = instance.list_proposals.call_args.kwargs
        assert call_kwargs["start_date"] == date(2026, 1, 1)
        assert call_kwargs["end_date"] == date(2026, 12, 31)


def test_list_proposals_paginates_results():
    with patch("app.modules.quotes.routes.QuoteService") as MockService:
        instance = MockService.return_value
        instance.list_proposals.return_value = {
            "items": [],
            "total": 50,
            "page": 2,
            "page_size": 10,
            "total_pages": 5,
        }

        response = client.get(PROPOSALS_URL, params={"page": 2, "page_size": 10})

        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 2
        assert data["total_pages"] == 5

        call_kwargs = instance.list_proposals.call_args.kwargs
        assert call_kwargs["page"] == 2
        assert call_kwargs["page_size"] == 10
