"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, Any


# Standard response envelope
class ApiError(BaseModel):
    code: str
    message: str
    details: Optional[dict] = {}


class ApiResponse(BaseModel):
    ok: bool
    data: Optional[Any] = None
    error: Optional[ApiError] = None


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None

    class Config:
        from_attributes = True


# Token schemas
class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int


# Auth request/response schemas
class SignInPasswordRequest(BaseModel):
    email: EmailStr
    password: str


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class SignInResponse(BaseModel):
    user: UserResponse
    tokens: TokenPair


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    tokens: TokenPair


class SessionResponse(BaseModel):
    user: UserResponse


class SignOutResponse(BaseModel):
    ok: bool
