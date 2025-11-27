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
    OAuth2SignInRequest,
    OAuth2ProvidersResponse,
    OAuth2ProviderConfig,
)
from auth_utils import (
    authenticate_user,
    hash_password,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    get_current_user,
    revoke_all_user_tokens,
    create_token_pair,
    generate_random_password,
)
from oauth2_utils import get_enabled_providers, exchange_oauth2_code

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


@app.get("/auth/providers", response_model=ApiResponse)
async def get_oauth_providers():
    """Get available OAuth2 providers"""
    providers = get_enabled_providers()

    provider_configs = [
        OAuth2ProviderConfig(
            name=p.name,
            displayName=p.display_name,
            authorizationUrl=p.authorization_url,
            clientId=p.client_id,
            scope=p.scope,
            redirectUri=p.redirect_uri,
        )
        for p in providers
    ]

    return ApiResponse(
        ok=True,
        data=OAuth2ProvidersResponse(providers=provider_configs).model_dump(),
    )


@app.post("/auth/sign-in/oauth2", response_model=ApiResponse)
async def sign_in_oauth2(
    request: OAuth2SignInRequest,
    db: Session = Depends(get_db)
):
    """
    Sign in with OAuth2.
    Exchange authorization code for user info and create/sign in user.
    """
    try:
        # Exchange code with OAuth2 provider for user info
        user_info = await exchange_oauth2_code(
            request.provider,
            request.code,
            request.redirect_uri
        )

        if not user_info.get("email"):
            return ApiResponse(
                ok=False,
                error=ApiError(
                    code="OAUTH2_NO_EMAIL",
                    message="OAuth2 provider did not return email",
                ),
            )

        # Find or create user
        user = db.query(User).filter(User.email == user_info["email"]).first()

        if user:
            # Existing user - verify it's the same OAuth provider or password user upgrading
            if user.oauth_provider and user.oauth_provider != request.provider:
                return ApiResponse(
                    ok=False,
                    error=ApiError(
                        code="ACCOUNT_EXISTS",
                        message=f"An account with this email already exists via {user.oauth_provider}",
                    ),
                )
            # Update OAuth info if not set (password user signing in with OAuth)
            if not user.oauth_provider:
                user.oauth_provider = request.provider
                user.oauth_provider_user_id = user_info.get("provider_user_id")
                # Generate random password as defense in depth
                user.hashed_password = hash_password(generate_random_password())
                db.commit()
        else:
            # Create new OAuth user
            user = User(
                email=user_info["email"],
                name=user_info.get("name"),
                hashed_password=hash_password(generate_random_password()),
                oauth_provider=request.provider,
                oauth_provider_user_id=user_info.get("provider_user_id"),
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Create tokens
        tokens_dict = create_token_pair(db, user.id)
        tokens = TokenPair(**tokens_dict)

        return ApiResponse(
            ok=True,
            data=SignInResponse(
                user=UserResponse.model_validate(user),
                tokens=tokens,
            ).model_dump(),
        )

    except ValueError as e:
        return ApiResponse(
            ok=False,
            error=ApiError(
                code="OAUTH2_ERROR",
                message=str(e),
            ),
        )
    except Exception as e:
        return ApiResponse(
            ok=False,
            error=ApiError(
                code="INTERNAL_ERROR",
                message=f"An error occurred: {str(e)}",
            ),
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

    tokens_dict = create_token_pair(db, user.id)
    tokens = TokenPair(**tokens_dict)

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

    tokens_dict = create_token_pair(db, new_user.id)
    tokens = TokenPair(**tokens_dict)

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
    tokens_dict = create_token_pair(db, refresh_token_obj.user_id)
    tokens = TokenPair(**tokens_dict)

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
    providers = get_enabled_providers()
    return {
        "version": "1.0.0",
        "plugins": ["password", "oauth2"] if providers else ["password"],
        "oauth2_providers": [p.name for p in providers],
        "features": {
            "password": True,
            "oauth2": len(providers) > 0,
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
