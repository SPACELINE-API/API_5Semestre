from typing import Any

from pydantic import BaseModel, EmailStr, Field, model_validator


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


class PasswordRecoveryRequest(BaseModel):
    email: EmailStr


class PasswordResetRequest(BaseModel):
    access_token: str = Field(min_length=1)
    password: str = Field(min_length=6)
    password_confirmation: str = Field(min_length=6)

    @model_validator(mode="after")
    def passwords_must_match(self) -> "PasswordResetRequest":
        if self.password != self.password_confirmation:
            raise ValueError("As senhas não coincidem")

        return self
