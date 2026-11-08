from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.modules.auth.schemas.login import PasswordPairRequest


def _normalize_name(value: str) -> str:
    name = " ".join(value.split())
    if not name:
        raise ValueError("Informe o nome.")
    return name


class InternalUserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=150)
    email: EmailStr
    role_ids: list[UUID] = Field(min_length=1)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return _normalize_name(value)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("role_ids")
    @classmethod
    def reject_duplicate_roles(cls, value: list[UUID]) -> list[UUID]:
        if len(value) != len(set(value)):
            raise ValueError("Perfis duplicados no cadastro.")
        return value


class InternalUserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=150)
    email: EmailStr | None = None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        return None if value is None else _normalize_name(value)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        return None if value is None else value.strip().lower()

    @model_validator(mode="after")
    def require_any_field(self) -> "InternalUserUpdate":
        if self.name is None and self.email is None:
            raise ValueError("Informe ao menos um campo para atualizar.")
        return self


class InternalUserRoleAdd(BaseModel):
    role_id: UUID


class InternalUserRoleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str


class PasswordSetupLinkResponse(BaseModel):
    status: str
    sent_at: datetime
    expires_at: datetime
    used_at: datetime | None = None


class InternalUserResponse(BaseModel):
    id: UUID
    name: str | None
    email: str
    is_active: bool
    status: str
    password_defined: bool
    roles: list[InternalUserRoleResponse] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    latest_link: PasswordSetupLinkResponse | None = None
    created_at: datetime
    updated_at: datetime


class PasswordSetupLinkInfo(BaseModel):
    status: str
    name: str | None = None
    email: str | None = None
    expires_at: datetime


class PasswordSetupRequest(PasswordPairRequest):
    token: str = Field(min_length=1, max_length=255)
