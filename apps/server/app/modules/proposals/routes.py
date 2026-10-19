from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.modules.auth.dependencies.dependencies import require_permission
from app.modules.proposals.schemas.proposal import ProposalListResponse
from app.modules.proposals.services.proposal_service import ProposalService
from app.shared.database import get_db

router = APIRouter(prefix="/quotes/proposals", tags=["proposals"])

proposals_read_permission = require_permission("proposals.read", allow_full_access=False)


@router.get("", response_model=ProposalListResponse)
def list_proposals(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    status_filter: str | None = Query(
        default=None, alias="status", pattern="^(pending|approved|reproved)$"
    ),
    order_by: str = Query(default="created_at"),
    order_dir: str = Query(default="desc"),
    _user=Depends(proposals_read_permission),
    db: Session = Depends(get_db),
) -> ProposalListResponse:
    service = ProposalService(db)
    try:
        result = service.list_proposals(
            page=page,
            page_size=page_size,
            start_date=start_date,
            end_date=end_date,
            status_filter=status_filter,
            order_by=order_by,
            order_dir=order_dir,
        )
    except HTTPException:
        raise
    return ProposalListResponse(**result)
