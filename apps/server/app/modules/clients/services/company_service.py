from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.clients.schemas.company import CompanyCreate


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
                status_code=409, detail="CNPJ or email already registered"
            ) from None

        self.db.refresh(company)
        return company

    def list_companies(self) -> list[Company]:
        return self.db.query(Company).all()
