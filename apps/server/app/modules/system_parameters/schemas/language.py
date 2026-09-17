from pydantic import BaseModel


class LanguageBase(BaseModel):
    id: str
    name: str

class LanguageCreate(LanguageBase):
    pass

class LanguageResponse(LanguageBase):
    class Config:
        from_attributes = True
