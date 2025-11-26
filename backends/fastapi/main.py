"""
Universal Auth SDK - FastAPI Reference Backend
"""
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

from config import get_settings
from models import init_db, get_db, User
from schemas import (
    ApiResponse,
    ApiError,
    SignInPasswordRequest,
    SignUpRequest,
    SignInResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    SessionResponse,
    SignOutResponse,
    UserResponse,
    TokenPair,
)
from auth_utils import (
    authenticate_user,
    hash_password,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    get_current_user,
    revoke_all_user_tokens,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database
    init_db()
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def create_token_pair(db: Session, user_id: str) -> TokenPair:
    """Create access and refresh tokens"""
    access_token = create_access_token(user_id)
    refresh_token_str, _ = create_refresh_token(db, user_id)

    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token_str,
        expires_in=settings.access_token_expire_minutes * 60,
    )


@app.post("/auth/sign-in/password", response_model=ApiResponse)
async def sign_in_password(
    request: SignInPasswordRequest,
    db: Session = Depends(get_db)
):
    """Sign in with email and password"""
    user = authenticate_user(db, request.email, request.password)

    if not user:
        return ApiResponse(
            ok=False,
            error=ApiError(
                code="INVALID_CREDENTIALS",
                message="Email or password is incorrect",
            ),
        )

    tokens = create_token_pair(db, user.id)

    return ApiResponse(
        ok=True,
        data=SignInResponse(
            user=UserResponse.model_validate(user),
            tokens=tokens,
        ).model_dump(),
    )


@app.post("/auth/sign-up", response_model=ApiResponse)
async def sign_up(
    request: SignUpRequest,
    db: Session = Depends(get_db)
):
    """Sign up a new user"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()

    if existing_user:
        return ApiResponse(
            ok=False,
            error=ApiError(
                code="EMAIL_EXISTS",
                message="A user with this email already exists",
            ),
        )

    # Create new user
    hashed_pw = hash_password(request.password)
    new_user = User(
        email=request.email,
        name=request.name,
        hashed_password=hashed_pw,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    tokens = create_token_pair(db, new_user.id)

    return ApiResponse(
        ok=True,
        data=SignInResponse(
            user=UserResponse.model_validate(new_user),
            tokens=tokens,
        ).model_dump(),
    )


@app.post("/auth/token/refresh", response_model=ApiResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token"""
    refresh_token_obj = verify_refresh_token(db, request.refresh_token)

    if not refresh_token_obj:
        return ApiResponse(
            ok=False,
            error=ApiError(
                code="INVALID_TOKEN",
                message="Refresh token is invalid or expired",
            ),
        )

    # Create new token pair (token rotation)
    tokens = create_token_pair(db, refresh_token_obj.user_id)

    # Optionally revoke old refresh token (for stricter security)
    # db.delete(refresh_token_obj)
    # db.commit()

    return ApiResponse(
        ok=True,
        data=RefreshTokenResponse(tokens=tokens).model_dump(),
    )


@app.get("/auth/session", response_model=ApiResponse)
async def get_session(
    current_user: User = Depends(get_current_user)
):
    """Get current session"""
    return ApiResponse(
        ok=True,
        data=SessionResponse(
            user=UserResponse.model_validate(current_user)
        ).model_dump(),
    )


@app.delete("/auth/session", response_model=ApiResponse)
async def sign_out(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sign out (revoke all refresh tokens)"""
    revoke_all_user_tokens(db, current_user.id)

    return ApiResponse(
        ok=True,
        data=SignOutResponse(ok=True).model_dump(),
    )


@app.get("/.well-known/auth-plugin-manifest.json")
async def plugin_manifest():
    """Return plugin manifest"""
    return {
        "version": "1.0.0",
        "plugins": ["password"],  # Add more as you implement them
        "features": {
            "password": True,
            "oauth2": False,
            "magic-link": False,
            "totp": False,
        },
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
