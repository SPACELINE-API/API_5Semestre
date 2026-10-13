import uuid
from typing import Any

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.modules.auth.dependencies.dependencies import require_permission
from app.modules.contacts.schemas.contact import (
    ContactCreate,
    ContactResponse,
    ContactUpdate,
    CreateContactResponse,
)
from app.modules.contacts.services.contact_service import ContactService
from app.shared.database import get_db

router = APIRouter(prefix="/contacts", tags=["contacts"])
contacts_read_permission = require_permission("contacts.read")
contacts_write_permission = require_permission("contacts.write")


@router.post("", status_code=201, response_model=CreateContactResponse)
def create_contact(
    contact_data: ContactCreate,
    _user=Depends(contacts_write_permission),
    db: Session = Depends(get_db),
) -> Any:
    service = ContactService(db)
    return service.create_contact(contact_data)


@router.get("", response_model=list[ContactResponse])
def list_contacts(
    _user=Depends(contacts_read_permission),
    db: Session = Depends(get_db),
) -> Any:
    service = ContactService(db)
    return service.list_contacts()


@router.patch("/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: uuid.UUID,
    contact_data: ContactUpdate,
    _user=Depends(contacts_write_permission),
    db: Session = Depends(get_db),
) -> Any:
    service = ContactService(db)
    return service.update_contact(contact_id, contact_data)


@router.delete("/{contact_id}", status_code=204)
def delete_contact(
    contact_id: uuid.UUID,
    _user=Depends(contacts_write_permission),
    db: Session = Depends(get_db),
) -> Response:
    service = ContactService(db)
    service.delete_contact(contact_id)
    return Response(status_code=204)
