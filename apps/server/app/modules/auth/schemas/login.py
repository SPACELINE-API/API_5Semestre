from typing import Any

from pydantic import BaseModel, EmailStr, model_validator


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @model_validator(mode="before")
    @classmethod
    def normalize_password_alias(cls, data: Any) -> Any:
        if isinstance(data, dict) and "password" not in data and "senha" in data:
            return {**data, "password": data["senha"]}

        return data


class UserResponse(BaseModel):
    id: str
    email: EmailStr


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: UserResponse
