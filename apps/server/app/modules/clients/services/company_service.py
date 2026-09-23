import uuid

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.clients.repositories.company_repository import CompanyRepository
from app.modules.clients.schemas.company import CompanyCreate, CompanyUpdate


class CompanyService:
    def __init__(self, db: Session):
        self.repo = CompanyRepository(db)

    def create_company(self, company_data: CompanyCreate) -> Company:
        company = Company(**company_data.model_dump())
        self.repo.add(company)

        try:
            self.repo.commit()
        except IntegrityError:
            self.repo.rollback()
            raise HTTPException(status_code=409, detail="CNPJ ou email já existe") from None

        self.repo.refresh(company)
        return company

    def delete_company(self, company_id: uuid.UUID) -> None:
        company = self.get_company(company_id)

        self.repo.delete(company)

        try:
            self.repo.commit()
        except IntegrityError:
            self.repo.rollback()
            raise HTTPException(
                status_code=409,
                detail="Empresa não pode ser deletada, pois possui registros relacionados",
            ) from None

    def list_companies(self) -> list[Company]:
        return self.repo.list_all()

    def search_companies(
        self,
        name: str | None = None,
        status: bool | None = None,
        product: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[Company], int]:
        return self.repo.search(
            name=name, status=status, product=product, page=page, page_size=page_size
        )

    def get_company(self, company_id: uuid.UUID) -> Company:
        company = self.repo.get_by_id(company_id)

        if not company:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")

        return company

    def update_company(self, company_id: uuid.UUID, company_data: CompanyUpdate) -> Company:
        company = self.get_company(company_id)

        for field, value in company_data.model_dump(exclude_unset=True).items():
            setattr(company, field, value)

        try:
            self.repo.commit()
        except IntegrityError:
            self.repo.rollback()
            raise HTTPException(status_code=409, detail="CNPJ ou email já existe") from None

        self.repo.refresh(company)
        return company
