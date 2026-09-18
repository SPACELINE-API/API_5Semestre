from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.contacts.models.contact import Contact
from app.modules.contacts.schemas.contact import ContactCreate


class ContactService:
    def __init__(self, db: Session):
        self.db = db

    def create_contact(self, contact_data: ContactCreate) -> dict:
        company = self.db.query(Company).filter(Company.id == contact_data.company_id).first()
        if not company:
            raise HTTPException(
                status_code=404, detail="Empresa associada não encontrada."
            )
            
        contact = Contact(**contact_data.model_dump())
        self.db.add(contact)
        self.db.commit()
        self.db.refresh(contact)
        
        return {
            "message": "Contato cadastrado com sucesso.",
            "contact": contact
        }
