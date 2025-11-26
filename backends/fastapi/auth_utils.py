"""
Authentication utilities
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Depends, Header
from sqlalchemy.orm import Session
import uuid

from config import get_settings
from models import User, RefreshToken, get_db

settings = get_settings()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode = {
        "sub": user_id,
        "exp": expire,
        "type": "access",
    }
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def create_refresh_token(db: Session, user_id: str) -> tuple[str, RefreshToken]:
    """Create a refresh token and store it in the database"""
    token_str = f"ref_{uuid.uuid4().hex}"
    expires_at = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)

    refresh_token = RefreshToken(
        user_id=user_id,
        token=token_str,
        expires_at=expires_at,
    )

    db.add(refresh_token)
    db.commit()
    db.refresh(refresh_token)

    return token_str, refresh_token


def verify_access_token(token: str) -> Optional[str]:
    """Verify a JWT access token and return the user_id"""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id is None or token_type != "access":
            return None

        return user_id
    except JWTError:
        return None


def verify_refresh_token(db: Session, token: str) -> Optional[RefreshToken]:
    """Verify a refresh token"""
    refresh_token = db.query(RefreshToken).filter(RefreshToken.token == token).first()

    if not refresh_token:
        return None

    # Check if token is expired
    if refresh_token.expires_at < datetime.utcnow():
        # Delete expired token
        db.delete(refresh_token)
        db.commit()
        return None

    return refresh_token


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate a user with email and password"""
    user = db.query(User).filter(User.email == email).first()

    if not user:
        return None

    if not verify_password(password, user.hashed_password):
        return None

    return user


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get the current authenticated user"""
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail={
                "ok": False,
                "data": None,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Authorization header missing",
                },
            },
        )

    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid authentication scheme")
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail={
                "ok": False,
                "data": None,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Invalid authorization header format",
                },
            },
        )

    # Verify token
    user_id = verify_access_token(token)
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail={
                "ok": False,
                "data": None,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Invalid or expired token",
                },
            },
        )

    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=401,
            detail={
                "ok": False,
                "data": None,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "User not found",
                },
            },
        )

    return user


def revoke_refresh_token(db: Session, token: str) -> bool:
    """Revoke a refresh token"""
    refresh_token = db.query(RefreshToken).filter(RefreshToken.token == token).first()

    if refresh_token:
        db.delete(refresh_token)
        db.commit()
        return True

    return False


def revoke_all_user_tokens(db: Session, user_id: str) -> int:
    """Revoke all refresh tokens for a user"""
    count = db.query(RefreshToken).filter(RefreshToken.user_id == user_id).delete()
    db.commit()
    return count
