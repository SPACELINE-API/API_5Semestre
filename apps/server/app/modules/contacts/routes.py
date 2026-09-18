from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Any

from app.modules.contacts.schemas.contact import ContactCreate, CreateContactResponse
from app.modules.contacts.services.contact_service import ContactService
from app.shared.database import get_db

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.post("", status_code=201, response_model=CreateContactResponse)
def create_contact(
    contact_data: ContactCreate,
    db: Session = Depends(get_db), 
) -> Any:
    service = ContactService(db)
    return service.create_contact(contact_data)
