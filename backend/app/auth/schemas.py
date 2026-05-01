from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RoleOut(BaseModel):
    role_id: str
    name: str
    description: Optional[str] = None
    is_system: bool

    model_config = {"from_attributes": True}


class UserOut(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: str                          # legacy column kept for compatibility
    is_active: bool
    last_login: Optional[datetime] = None
    roles: list[RoleOut] = []
    permissions: list[str] = []

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserOut"


class RefreshRequest(BaseModel):
    refresh_token: str


TokenResponse.model_rebuild()
