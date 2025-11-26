"""
Tests for FastAPI authentication backend
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from models import Base, get_db, User, RefreshToken
from auth_utils import hash_password
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
