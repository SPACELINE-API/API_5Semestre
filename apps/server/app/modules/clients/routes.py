from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.modules.clients.schemas.company import CompanyCreate, CompanyResponse
from app.modules.clients.services.company_service import CompanyService
from app.shared.database import get_db

router = APIRouter(prefix="/clients", tags=["clients"])


@router.post("", response_model=CompanyResponse, status_code=201)
def create_company(
    company_data: CompanyCreate,
    db: Session = Depends(get_db),  # noqa: B008
):
    service = CompanyService(db)
    return service.create_company(company_data)


@router.get("", response_model=list[CompanyResponse])
def list_companies(
    db: Session = Depends(get_db),  # noqa: B008
):
    service = CompanyService(db)
    return service.list_companies()
