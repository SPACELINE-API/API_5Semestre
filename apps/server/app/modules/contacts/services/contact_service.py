import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.clients.models.company import Company
from app.modules.contacts.models.contact import Contact
from app.modules.contacts.schemas.contact import ContactCreate, ContactUpdate


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

    def list_contacts(self) -> list[Contact]:
        return self.db.query(Contact).all()

    def update_contact(self, contact_id: uuid.UUID, contact_data: ContactUpdate) -> Contact:
        contact = self.db.query(Contact).filter(Contact.id == contact_id).first()
        if not contact:
            raise HTTPException(status_code=404, detail="Contato não encontrado.")

        if contact_data.company_id is not None:
            company = self.db.query(Company).filter(Company.id == contact_data.company_id).first()
            if not company:
                raise HTTPException(
                    status_code=404, detail="Empresa associada não encontrada."
                )

        update_data = contact_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(contact, key, value)

        self.db.commit()
        self.db.refresh(contact)
        return contact

    def delete_contact(self, contact_id: uuid.UUID) -> None:
        contact = self.db.query(Contact).filter(Contact.id == contact_id).first()
        if not contact:
            raise HTTPException(status_code=404, detail="Contato não encontrado.")
            
        self.db.delete(contact)
        self.db.commit()
