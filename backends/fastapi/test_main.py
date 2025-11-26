"""
Tests for FastAPI authentication backend
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from unittest.mock import patch, AsyncMock
from main import app
from models import Base, get_db, User, RefreshToken
from auth_utils import hash_password, generate_random_password
from config import get_settings

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Create tables before each test and drop after"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user(setup_database):
    """Create a test user"""
    db = TestingSessionLocal()
    user = User(
        email="test@example.com",
        name="Test User",
        hashed_password=hash_password("password123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


class TestSignUp:
    def test_sign_up_success(self):
        """Test successful user registration"""
        response = client.post(
            "/auth/sign-up",
            json={
                "email": "newuser@example.com",
                "password": "securepass123",
                "name": "New User",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["data"]["user"]["email"] == "newuser@example.com"
        assert data["data"]["user"]["name"] == "New User"
        assert "access_token" in data["data"]["tokens"]
        assert "refresh_token" in data["data"]["tokens"]
        assert data["data"]["tokens"]["expires_in"] > 0

    def test_sign_up_duplicate_email(self, test_user):
        """Test sign up with existing email"""
        response = client.post(
            "/auth/sign-up",
            json={
                "email": test_user.email,
                "password": "password123",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is False
        assert data["error"]["code"] == "EMAIL_EXISTS"

    def test_sign_up_invalid_email(self):
        """Test sign up with invalid email"""
        response = client.post(
            "/auth/sign-up",
            json={
                "email": "invalid-email",
                "password": "password123",
            },
        )

        assert response.status_code == 422  # Validation error

    def test_sign_up_missing_password(self):
        """Test sign up without password"""
        response = client.post(
            "/auth/sign-up",
            json={
                "email": "test@example.com",
            },
        )

        assert response.status_code == 422  # Validation error


class TestSignIn:
    def test_sign_in_success(self, test_user):
        """Test successful sign in"""
        response = client.post(
            "/auth/sign-in/password",
            json={
                "email": test_user.email,
                "password": "password123",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["data"]["user"]["email"] == test_user.email
        assert "access_token" in data["data"]["tokens"]
        assert "refresh_token" in data["data"]["tokens"]

    def test_sign_in_wrong_password(self, test_user):
        """Test sign in with wrong password"""
        response = client.post(
            "/auth/sign-in/password",
            json={
                "email": test_user.email,
                "password": "wrongpassword",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is False
        assert data["error"]["code"] == "INVALID_CREDENTIALS"

    def test_sign_in_nonexistent_user(self):
        """Test sign in with non-existent email"""
        response = client.post(
            "/auth/sign-in/password",
            json={
                "email": "nonexistent@example.com",
                "password": "password123",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is False
        assert data["error"]["code"] == "INVALID_CREDENTIALS"

    def test_sign_in_invalid_email(self):
        """Test sign in with invalid email format"""
        response = client.post(
            "/auth/sign-in/password",
            json={
                "email": "invalid",
                "password": "password123",
            },
        )

        assert response.status_code == 422  # Validation error


class TestSession:
    def test_get_session_success(self, test_user):
        """Test getting current session with valid token"""
        # First sign in to get token
        sign_in_response = client.post(
            "/auth/sign-in/password",
            json={
                "email": test_user.email,
                "password": "password123",
            },
        )
        access_token = sign_in_response.json()["data"]["tokens"]["access_token"]

        # Get session
        response = client.get(
            "/auth/session",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["data"]["user"]["email"] == test_user.email

    def test_get_session_no_token(self):
        """Test getting session without token"""
        response = client.get("/auth/session")

        assert response.status_code == 401

    def test_get_session_invalid_token(self):
        """Test getting session with invalid token"""
        response = client.get(
            "/auth/session",
            headers={"Authorization": "Bearer invalid_token"},
        )

        assert response.status_code == 401

    def test_get_session_malformed_header(self):
        """Test getting session with malformed auth header"""
        response = client.get(
            "/auth/session",
            headers={"Authorization": "InvalidFormat token"},
        )

        assert response.status_code == 401


class TestTokenRefresh:
    def test_refresh_token_success(self, test_user):
        """Test successful token refresh"""
        # Sign in to get refresh token
        sign_in_response = client.post(
            "/auth/sign-in/password",
            json={
                "email": test_user.email,
                "password": "password123",
            },
        )
        refresh_token = sign_in_response.json()["data"]["tokens"]["refresh_token"]

        # Refresh token
        response = client.post(
            "/auth/token/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "access_token" in data["data"]["tokens"]
        assert "refresh_token" in data["data"]["tokens"]
        assert data["data"]["tokens"]["expires_in"] > 0

    def test_refresh_token_invalid(self):
        """Test refresh with invalid token"""
        response = client.post(
            "/auth/token/refresh",
            json={"refresh_token": "invalid_token"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is False
        assert data["error"]["code"] == "INVALID_TOKEN"

    def test_refresh_token_missing(self):
        """Test refresh without token"""
        response = client.post("/auth/token/refresh", json={})

        assert response.status_code == 422  # Validation error


class TestSignOut:
    def test_sign_out_success(self, test_user):
        """Test successful sign out"""
        # Sign in first
        sign_in_response = client.post(
            "/auth/sign-in/password",
            json={
                "email": test_user.email,
                "password": "password123",
            },
        )
        access_token = sign_in_response.json()["data"]["tokens"]["access_token"]
        refresh_token = sign_in_response.json()["data"]["tokens"]["refresh_token"]

        # Sign out
        response = client.delete(
            "/auth/session",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["data"]["ok"] is True

        # Try to use refresh token (should fail)
        refresh_response = client.post(
            "/auth/token/refresh",
            json={"refresh_token": refresh_token},
        )
        assert refresh_response.json()["ok"] is False

    def test_sign_out_no_token(self):
        """Test sign out without token"""
        response = client.delete("/auth/session")

        assert response.status_code == 401


class TestPluginManifest:
    def test_plugin_manifest(self):
        """Test plugin manifest endpoint"""
        response = client.get("/.well-known/auth-plugin-manifest.json")

        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert "plugins" in data
        assert isinstance(data["plugins"], list)
        assert "password" in data["plugins"]


class TestRootEndpoint:
    def test_root_endpoint(self):
        """Test root endpoint"""
        response = client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "status" in data
        assert data["status"] == "operational"


class TestSecurity:
    def test_password_hashed(self, test_user):
        """Test that passwords are hashed"""
        db = TestingSessionLocal()
        user = db.query(User).filter(User.email == test_user.email).first()
        db.close()

        # Password should be hashed, not plain text
        assert user.hashed_password != "password123"
        assert len(user.hashed_password) > 20  # Bcrypt hashes are long

    def test_cors_headers(self):
        """Test CORS headers are present"""
        response = client.options(
            "/auth/sign-in/password",
            headers={"Origin": "http://localhost:3000"},
        )

        assert "access-control-allow-origin" in response.headers

    def test_tokens_different_for_different_users(self):
        """Test that different users get different tokens"""
        # Create two users
        user1_response = client.post(
            "/auth/sign-up",
            json={
                "email": "user1@example.com",
                "password": "password123",
            },
        )

        user2_response = client.post(
            "/auth/sign-up",
            json={
                "email": "user2@example.com",
                "password": "password123",
            },
        )

        token1 = user1_response.json()["data"]["tokens"]["access_token"]
        token2 = user2_response.json()["data"]["tokens"]["access_token"]

        assert token1 != token2


class TestResponseFormat:
    def test_success_response_format(self, test_user):
        """Test that success responses follow standard format"""
        response = client.post(
            "/auth/sign-in/password",
            json={
                "email": test_user.email,
                "password": "password123",
            },
        )

        data = response.json()
        assert "ok" in data
        assert "data" in data
        assert "error" in data
        assert data["ok"] is True
        assert data["data"] is not None
        assert data["error"] is None

    def test_error_response_format(self):
        """Test that error responses follow standard format"""
        response = client.post(
            "/auth/sign-in/password",
            json={
                "email": "wrong@example.com",
                "password": "wrongpass",
            },
        )

        data = response.json()
        assert "ok" in data
        assert "data" in data
        assert "error" in data
        assert data["ok"] is False
        assert data["data"] is None
        assert data["error"] is not None
        assert "code" in data["error"]
        assert "message" in data["error"]


class TestOAuth2Providers:
    def test_get_providers_empty(self):
        """Test getting providers when none are configured"""
        response = client.get("/auth/providers")

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        # No providers configured by default (empty client_id/secret)
        assert data["data"]["providers"] == []

    @patch("main.get_enabled_providers")
    def test_get_providers_with_configured(self, mock_providers):
        """Test getting providers when some are configured"""
        from oauth2_utils import OAuth2ProviderConfig

        mock_providers.return_value = [
            OAuth2ProviderConfig(
                name="google",
                display_name="Google",
                authorization_url="https://accounts.google.com/o/oauth2/v2/auth",
                token_url="https://oauth2.googleapis.com/token",
                userinfo_url="https://www.googleapis.com/oauth2/v2/userinfo",
                client_id="test-client-id",
                client_secret="test-secret",
                scope="openid email profile",
            )
        ]

        response = client.get("/auth/providers")

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert len(data["data"]["providers"]) == 1
        assert data["data"]["providers"][0]["name"] == "google"
        assert data["data"]["providers"][0]["clientId"] == "test-client-id"
        # Client secret should NOT be returned
        assert "clientSecret" not in data["data"]["providers"][0]


class TestOAuth2SignIn:
    @patch("main.exchange_oauth2_code")
    def test_oauth2_sign_in_success(self, mock_exchange):
        """Test successful OAuth2 sign in with new user"""
        mock_exchange.return_value = {
            "email": "oauth@example.com",
            "name": "OAuth User",
            "provider_user_id": "12345",
            "provider": "google",
        }

        response = client.post(
            "/auth/sign-in/oauth2",
            json={
                "provider": "google",
                "code": "auth-code-123",
                "redirect_uri": "http://localhost:3000/callback",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["data"]["user"]["email"] == "oauth@example.com"
        assert data["data"]["user"]["name"] == "OAuth User"
        assert "access_token" in data["data"]["tokens"]
        assert "refresh_token" in data["data"]["tokens"]

    @patch("main.exchange_oauth2_code")
    def test_oauth2_sign_in_existing_user(self, mock_exchange, test_user):
        """Test OAuth2 sign in with existing password user"""
        mock_exchange.return_value = {
            "email": test_user.email,
            "name": "Test User",
            "provider_user_id": "12345",
            "provider": "google",
        }

        response = client.post(
            "/auth/sign-in/oauth2",
            json={
                "provider": "google",
                "code": "auth-code-123",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["data"]["user"]["email"] == test_user.email

    @patch("main.exchange_oauth2_code")
    def test_oauth2_sign_in_different_provider(self, mock_exchange):
        """Test OAuth2 sign in when account exists with different provider"""
        # First create an OAuth user
        db = TestingSessionLocal()
        oauth_user = User(
            email="oauth@example.com",
            name="OAuth User",
            hashed_password=hash_password(generate_random_password()),
            oauth_provider="github",
            oauth_provider_user_id="github-123",
        )
        db.add(oauth_user)
        db.commit()
        db.close()

        # Try to sign in with different provider
        mock_exchange.return_value = {
            "email": "oauth@example.com",
            "name": "OAuth User",
            "provider_user_id": "google-456",
            "provider": "google",
        }

        response = client.post(
            "/auth/sign-in/oauth2",
            json={
                "provider": "google",
                "code": "auth-code-123",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is False
        assert data["error"]["code"] == "ACCOUNT_EXISTS"
        assert "github" in data["error"]["message"]

    @patch("main.exchange_oauth2_code")
    def test_oauth2_sign_in_no_email(self, mock_exchange):
        """Test OAuth2 sign in when provider doesn't return email"""
        mock_exchange.return_value = {
            "email": None,
            "name": "No Email User",
            "provider_user_id": "12345",
            "provider": "google",
        }

        response = client.post(
            "/auth/sign-in/oauth2",
            json={
                "provider": "google",
                "code": "auth-code-123",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is False
        assert data["error"]["code"] == "OAUTH2_NO_EMAIL"

    @patch("main.exchange_oauth2_code")
    def test_oauth2_sign_in_provider_error(self, mock_exchange):
        """Test OAuth2 sign in when provider exchange fails"""
        mock_exchange.side_effect = ValueError("Failed to exchange code")

        response = client.post(
            "/auth/sign-in/oauth2",
            json={
                "provider": "google",
                "code": "invalid-code",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is False
        assert data["error"]["code"] == "OAUTH2_ERROR"


class TestOAuth2Security:
    def test_oauth_user_cannot_password_login(self):
        """Test that OAuth users cannot use password login"""
        # Create an OAuth user
        db = TestingSessionLocal()
        oauth_user = User(
            email="oauthonly@example.com",
            name="OAuth Only User",
            hashed_password=hash_password("known-random-password"),
            oauth_provider="google",
            oauth_provider_user_id="google-123",
        )
        db.add(oauth_user)
        db.commit()
        db.close()

        # Try to sign in with password (even if someone knows the random password)
        response = client.post(
            "/auth/sign-in/password",
            json={
                "email": "oauthonly@example.com",
                "password": "known-random-password",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is False
        assert data["error"]["code"] == "INVALID_CREDENTIALS"


class TestOAuth2PluginManifest:
    def test_manifest_without_oauth_providers(self):
        """Test manifest when no OAuth providers configured"""
        response = client.get("/.well-known/auth-plugin-manifest.json")

        assert response.status_code == 200
        data = response.json()
        assert "password" in data["plugins"]
        # oauth2 not in plugins when not configured
        assert data["features"]["password"] is True

    @patch("main.get_enabled_providers")
    def test_manifest_with_oauth_providers(self, mock_providers):
        """Test manifest when OAuth providers are configured"""
        from oauth2_utils import OAuth2ProviderConfig

        mock_providers.return_value = [
            OAuth2ProviderConfig(
                name="google",
                display_name="Google",
                authorization_url="https://accounts.google.com/o/oauth2/v2/auth",
                token_url="https://oauth2.googleapis.com/token",
                userinfo_url="https://www.googleapis.com/oauth2/v2/userinfo",
                client_id="test-client-id",
                client_secret="test-secret",
                scope="openid email profile",
            )
        ]

        response = client.get("/.well-known/auth-plugin-manifest.json")

        assert response.status_code == 200
        data = response.json()
        assert "oauth2" in data["plugins"]
        assert data["features"]["oauth2"] is True
        assert "google" in data["oauth2_providers"]
