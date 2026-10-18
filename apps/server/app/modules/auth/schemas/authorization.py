from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AuthenticatedRoleResponse(BaseModel):
    id: UUID
    name: str


class AuthenticatedUserResponse(BaseModel):
    id: UUID
    email: EmailStr


class AuthenticatedAccessResponse(BaseModel):
    user: AuthenticatedUserResponse
    roles: list[AuthenticatedRoleResponse] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)


class UserRolesUpdate(BaseModel):
    role_ids: list[UUID] = Field(default_factory=list)


class UserAccessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    roles: list[AuthenticatedRoleResponse] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)


class AuthorizationAuditResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    target_type: str
    target_id: UUID | None
    target_name: str
    action: str
    actor_user_id: UUID | None
    actor_email: EmailStr
    before: dict[str, Any] | None
    after: dict[str, Any] | None
    created_at: datetime
