import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.modules.auth.dependencies.dependencies import require_permission
from app.modules.clients.schemas.company import CompanyCreate, CompanyResponse, CompanyUpdate
from app.modules.clients.services.company_service import CompanyService
from app.shared.database import get_db

router = APIRouter(prefix="/clients", tags=["clients"])
clients_read_permission = require_permission("clients.read")
clients_write_permission = require_permission("clients.write")


@router.post("", response_model=CompanyResponse, status_code=201)
def create_company(
    company_data: CompanyCreate,
    _user=Depends(clients_write_permission),
    db: Session = Depends(get_db),  # noqa: B008
):
    service = CompanyService(db)
    return service.create_company(company_data)


@router.get("", response_model=list[CompanyResponse])
def list_companies(
    _user=Depends(clients_read_permission),
    db: Session = Depends(get_db),  # noqa: B008
):
    service = CompanyService(db)
    return service.list_companies()


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(
    company_id: uuid.UUID,
    _user=Depends(clients_read_permission),
    db: Session = Depends(get_db),  # noqa: B008
):
    service = CompanyService(db)
    return service.get_company(company_id)


@router.patch("/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: uuid.UUID,
    company_data: CompanyUpdate,
    _user=Depends(clients_write_permission),
    db: Session = Depends(get_db),  # noqa: B008
):
    service = CompanyService(db)
    return service.update_company(company_id, company_data)


@router.delete("/{company_id}", status_code=204)
def delete_company(
    company_id: uuid.UUID,
    _user=Depends(clients_write_permission),
    db: Session = Depends(get_db),  # noqa: B008
):
    service = CompanyService(db)
    service.delete_company(company_id)
