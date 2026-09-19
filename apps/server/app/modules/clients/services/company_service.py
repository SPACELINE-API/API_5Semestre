import uuid

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.clients.schemas.company import CompanyCreate, CompanyUpdate


class CompanyService:
    def __init__(self, db: Session):
        self.db = db

    def create_company(self, company_data: CompanyCreate) -> Company:
        company = Company(**company_data.model_dump())
        self.db.add(company)

        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=409, detail="CNPJ ou email já existe"
            ) from None

        self.db.refresh(company)
        return company

    def delete_company(self, company_id: uuid.UUID) -> None:
        company = self.get_company(company_id)

        self.db.delete(company)

        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=409,
                detail="Empresa não pode ser deletada, pois possui registros relacionados",
            ) from None

    def list_companies(self) -> list[Company]:
        return self.db.query(Company).all()

    def get_company(self, company_id: uuid.UUID) -> Company:
        company = self.db.query(Company).filter(Company.id == company_id).first()

        if not company:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")

        return company

    def update_company(self, company_id: uuid.UUID, company_data: CompanyUpdate) -> Company:
        company = self.get_company(company_id)

        for field, value in company_data.model_dump(exclude_unset=True).items():
            setattr(company, field, value)

        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=409, detail="CNPJ ou email já existe"
            ) from None

        self.db.refresh(company)
        return company
