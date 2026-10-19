from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
import datetime

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    is_active: bool
    is_enrolled: bool
    consent_given: bool
    consent_timestamp: Optional[datetime.datetime] = None
    totp_enabled: bool
    created_at: datetime.datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    session_token: str
    user: UserResponse

class ConsentUpdate(BaseModel):
    consent_given: bool
