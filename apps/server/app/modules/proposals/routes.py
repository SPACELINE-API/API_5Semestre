from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.modules.auth.dependencies.dependencies import require_permission
from app.modules.proposals.schemas.proposal import ProposalListResponse
from app.modules.proposals.schemas.report import (
    CompanyReportFileResponse,
    CompanyReportRequest,
)
from app.modules.proposals.services.company_report_service import CompanyReportService
from app.modules.proposals.services.proposal_service import ProposalService
from app.modules.proposals.services.report_exporter import (
    build_csv,
    build_xlsx,
)
from app.modules.proposals.services.report_storage import REPORT_URL_EXPIRES_IN, upload_report
from app.modules.quotes.models.quote import QUOTE_STATUS_PATTERN
from app.shared.database import get_db

router = APIRouter(prefix="/quotes/proposals", tags=["proposals"])

proposals_read_permission = require_permission("proposals.read", allow_full_access=False)


@router.get("/companies", response_model=list[str])
def list_proposal_companies(
    _user=Depends(proposals_read_permission),
    db: Session = Depends(get_db),
) -> list[str]:
    return ProposalService(db).list_enterprises()


@router.get("", response_model=ProposalListResponse)
def list_proposals(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status", pattern=QUOTE_STATUS_PATTERN),
    enterprise: str | None = Query(default=None, min_length=1, max_length=155),
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
            enterprise=enterprise,
            order_by=order_by,
            order_dir=order_dir,
        )
    except HTTPException:
        raise
    return ProposalListResponse(**result)


@router.post("/reports", response_model=None)
def generate_company_report(
    report_request: CompanyReportRequest,
    _user=Depends(proposals_read_permission),
    db: Session = Depends(get_db),
) -> CompanyReportFileResponse:
    report = CompanyReportService(db).generate(report_request)
    if report_request.format == "csv":
        filename = "relatorio-propostas.csv"
        content = build_csv(report)
        return CompanyReportFileResponse(
            url=upload_report(content, filename, "text/csv; charset=utf-8"),
            filename=filename,
            expires_in=REPORT_URL_EXPIRES_IN,
        )
    if report_request.format == "xlsx":
        filename = "relatorio-propostas.xlsx"
        content = build_xlsx(report)
        return CompanyReportFileResponse(
            url=upload_report(
                content,
                filename,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ),
            filename=filename,
            expires_in=REPORT_URL_EXPIRES_IN,
        )
