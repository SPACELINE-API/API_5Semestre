from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.modules.system_parameters.models.language import Language
from app.modules.system_parameters.schemas.language import LanguageCreate, LanguageResponse
from app.shared.database import get_db

router = APIRouter(prefix="/support", tags=["support"])


@router.get("/languages", response_model=list[LanguageResponse])
def get_languages(db: Session = Depends(get_db)):
    languages = db.query(Language).order_by(Language.name).all()
    return languages


@router.post("/languages", response_model=LanguageResponse, status_code=status.HTTP_201_CREATED)
def create_language(payload: LanguageCreate, db: Session = Depends(get_db)):
    existing = db.query(Language).filter(Language.id == payload.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Language already exists")

    new_language = Language(id=payload.id, name=payload.name)
    db.add(new_language)
    db.commit()
    db.refresh(new_language)
    return new_language
