from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.modules.auth.dependencies.dependencies import (
    get_current_user,
    require_permission,
)
from app.modules.system_parameters.models.language import Language
from app.modules.system_parameters.schemas.inactivity_timeout import (
    InactivityTimeoutResponse,
    InactivityTimeoutUpdate,
)
from app.modules.system_parameters.schemas.language import LanguageCreate, LanguageResponse
from app.modules.system_parameters.services.inactivity_timeout import InactivityTimeoutService
from app.shared.database import get_db

router = APIRouter(prefix="/support", tags=["support"])
settings_read_permission = require_permission("settings.read")
settings_write_permission = require_permission("settings.write")


@router.get("/languages", response_model=list[LanguageResponse])
def get_languages(db: Session = Depends(get_db)):
    languages = db.query(Language).order_by(Language.name).all()
    return languages


@router.post("/languages", response_model=LanguageResponse, status_code=status.HTTP_201_CREATED)
def create_language(
    payload: LanguageCreate,
    db: Session = Depends(get_db),
    _user=Depends(settings_write_permission),
):
    existing = db.query(Language).filter(Language.id == payload.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Language already exists")

    new_language = Language(id=payload.id, name=payload.name)
    db.add(new_language)
    db.commit()
    db.refresh(new_language)
    return new_language


@router.get("/inactivity-timeout", response_model=InactivityTimeoutResponse)
def get_inactivity_timeout(
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    return InactivityTimeoutService(db).get_inactivity_timeout()


@router.patch("/inactivity-timeout", response_model=InactivityTimeoutResponse)
def change_inactivity_timeout(
    payload: InactivityTimeoutUpdate,
    db: Session = Depends(get_db),
    _user=Depends(settings_write_permission),
):
    return InactivityTimeoutService(db).update_inactivity_timeout(payload)
