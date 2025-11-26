"""
OAuth2 provider integrations and utilities
"""
import httpx
from typing import Optional, Dict, Any
from config import get_settings

settings = get_settings()


class OAuth2ProviderConfig:
    """OAuth2 provider configuration"""

    def __init__(
        self,
        name: str,
        display_name: str,
        authorization_url: str,
        token_url: str,
        userinfo_url: str,
        client_id: str,
        client_secret: str,
        scope: str,
        redirect_uri: Optional[str] = None,
    ):
        self.name = name
        self.display_name = display_name
        self.authorization_url = authorization_url
        self.token_url = token_url
        self.userinfo_url = userinfo_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.scope = scope
        self.redirect_uri = redirect_uri


# Configure your OAuth2 providers here
# You would normally load these from environment variables
OAUTH2_PROVIDERS: Dict[str, OAuth2ProviderConfig] = {
    "google": OAuth2ProviderConfig(
        name="google",
        display_name="Google",
        authorization_url="https://accounts.google.com/o/oauth2/v2/auth",
        token_url="https://oauth2.googleapis.com/token",
        userinfo_url="https://www.googleapis.com/oauth2/v2/userinfo",
        client_id=settings.google_client_id if hasattr(settings, 'google_client_id') else "",
        client_secret=settings.google_client_secret if hasattr(settings, 'google_client_secret') else "",
        scope="openid email profile",
        redirect_uri=settings.oauth_redirect_uri if hasattr(settings, 'oauth_redirect_uri') else None,
    ),
    "github": OAuth2ProviderConfig(
        name="github",
        display_name="GitHub",
        authorization_url="https://github.com/login/oauth/authorize",
        token_url="https://github.com/login/oauth/access_token",
        userinfo_url="https://api.github.com/user",
        client_id=settings.github_client_id if hasattr(settings, 'github_client_id') else "",
        client_secret=settings.github_client_secret if hasattr(settings, 'github_client_secret') else "",
        scope="user:email",
        redirect_uri=settings.oauth_redirect_uri if hasattr(settings, 'oauth_redirect_uri') else None,
    ),
}


def get_enabled_providers() -> list[OAuth2ProviderConfig]:
    """Get list of enabled OAuth2 providers (those with client_id configured)"""
    return [
        provider
        for provider in OAUTH2_PROVIDERS.values()
        if provider.client_id and provider.client_secret
    ]


async def exchange_oauth2_code(
    provider_name: str, code: str, redirect_uri: Optional[str] = None
) -> Dict[str, Any]:
    """
    Exchange OAuth2 authorization code for user information

    Args:
        provider_name: Name of the OAuth2 provider (google, github, etc.)
        code: Authorization code from OAuth2 provider
        redirect_uri: Redirect URI used in the authorization request

    Returns:
        Dict with user information: { 'email': str, 'name': str, 'provider_user_id': str }

    Raises:
        ValueError: If provider not found or exchange fails
    """
    provider = OAUTH2_PROVIDERS.get(provider_name)
    if not provider:
        raise ValueError(f"OAuth2 provider '{provider_name}' not configured")

    if not provider.client_id or not provider.client_secret:
        raise ValueError(f"OAuth2 provider '{provider_name}' not properly configured")

    # Step 1: Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_data = {
            "client_id": provider.client_id,
            "client_secret": provider.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri or provider.redirect_uri or "",
        }

        # GitHub requires Accept header for JSON response
        headers = {"Accept": "application/json"}

        token_response = await client.post(
            provider.token_url, data=token_data, headers=headers
        )

        if token_response.status_code != 200:
            raise ValueError(
                f"Failed to exchange code with {provider_name}: {token_response.text}"
            )

        token_json = token_response.json()
        access_token = token_json.get("access_token")

        if not access_token:
            raise ValueError(
                f"No access token returned from {provider_name}: {token_json}"
            )

        # Step 2: Get user information
        userinfo_headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

        userinfo_response = await client.get(
            provider.userinfo_url, headers=userinfo_headers
        )

        if userinfo_response.status_code != 200:
            raise ValueError(
                f"Failed to get user info from {provider_name}: {userinfo_response.text}"
            )

        userinfo = userinfo_response.json()

        # Normalize user info based on provider
        if provider_name == "google":
            return {
                "email": userinfo.get("email"),
                "name": userinfo.get("name"),
                "provider_user_id": userinfo.get("id"),
                "provider": provider_name,
            }
        elif provider_name == "github":
            # GitHub might not return email in userinfo if not public
            email = userinfo.get("email")

            # If email is not public, fetch from emails endpoint
            if not email:
                emails_response = await client.get(
                    "https://api.github.com/user/emails",
                    headers=userinfo_headers
                )
                if emails_response.status_code == 200:
                    emails = emails_response.json()
                    # Find primary email
                    primary_email = next(
                        (e for e in emails if e.get("primary")),
                        emails[0] if emails else None
                    )
                    if primary_email:
                        email = primary_email.get("email")

            return {
                "email": email,
                "name": userinfo.get("name") or userinfo.get("login"),
                "provider_user_id": str(userinfo.get("id")),
                "provider": provider_name,
            }
        else:
            # Generic fallback
            return {
                "email": userinfo.get("email"),
                "name": userinfo.get("name"),
                "provider_user_id": userinfo.get("id"),
                "provider": provider_name,
            }
