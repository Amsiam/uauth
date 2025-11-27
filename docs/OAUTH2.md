# OAuth2 Plugin Guide

This guide covers how to set up OAuth2 authentication with the Universal Auth SDK.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your App      │     │   Your Backend  │     │  OAuth Provider │
│  (SDK Client)   │     │    (FastAPI)    │     │ (Google/GitHub) │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. GET /auth/providers                       │
         │─────────────────────>│                       │
         │<─────────────────────│                       │
         │  Returns: providers with public config       │
         │                       │                       │
         │  2. Redirect to OAuth provider               │
         │─────────────────────────────────────────────>│
         │                       │                       │
         │  3. User authorizes                          │
         │<─────────────────────────────────────────────│
         │  Redirect with ?code=xxx                     │
         │                       │                       │
         │  4. POST /auth/sign-in/oauth2 (code)        │
         │─────────────────────>│                       │
         │                       │  5. Exchange code    │
         │                       │─────────────────────>│
         │                       │<─────────────────────│
         │                       │  User info           │
         │<─────────────────────│                       │
         │  Returns: user + tokens                      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Backend Setup

### 1. Configure OAuth2 Providers

Add your OAuth2 credentials to environment variables:

```bash
# .env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback
```

### 2. Get OAuth2 Credentials

#### Google
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Go to "APIs & Services" > "Credentials"
4. Create "OAuth 2.0 Client ID"
5. Add authorized redirect URIs
6. Copy Client ID and Client Secret

#### GitHub
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Set Authorization callback URL
4. Copy Client ID and Client Secret

### 3. Database Migration

If upgrading from password-only auth, add OAuth fields to your User model:

```sql
ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50);
ALTER TABLE users ADD COLUMN oauth_provider_user_id VARCHAR(255);
```

## Client Setup

### 1. Install and Configure the OAuth2 Plugin

```typescript
import { createAuth, createOAuth2Plugin } from '@uauth/core';

const auth = createAuth({
  baseURL: 'http://localhost:8000',
});

// Install the OAuth2 plugin
const oauth2Plugin = createOAuth2Plugin();
await auth.plugin('oauth2', oauth2Plugin);
```

### 2. Load Available Providers

```typescript
// Providers are auto-loaded on plugin install, but you can manually refresh:
const providers = await auth.oauth2.loadProviders();
console.log('Available providers:', providers);
// [{ name: 'google', displayName: 'Google', ... }, { name: 'github', ... }]
```

### 3. Sign In with Popup (Recommended)

```typescript
// Sign in with Google using popup
const result = await auth.oauth2.signInWithPopup({
  provider: 'google',
});

if (result.ok) {
  console.log('Signed in:', result.data.user);
} else {
  console.error('Sign in failed:', result.error);
}
```

### 4. Sign In with Redirect

```typescript
// Redirect to Google for sign in
await auth.oauth2.signInWithRedirect({
  provider: 'google',
  redirectUri: 'http://localhost:5173/auth/callback',
});

// On callback page (/auth/callback)
const result = await auth.oauth2.handleCallback();

if (result.ok) {
  // Redirect to dashboard
  window.location.href = '/dashboard';
}
```

## React Integration

### OAuth2 Sign In Button Component

```tsx
import { useAuth } from '@@uauth/core/react';
import { useState, useEffect } from 'react';

function OAuthButtons() {
  const { auth } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load available providers
    auth.oauth2?.getProviders().then(setProviders);
  }, [auth]);

  const handleOAuthSignIn = async (provider: string) => {
    setLoading(true);
    try {
      const result = await auth.oauth2.signInWithPopup({ provider });
      if (!result.ok) {
        alert(result.error?.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {providers.map((provider) => (
        <button
          key={provider.name}
          onClick={() => handleOAuthSignIn(provider.name)}
          disabled={loading}
        >
          Sign in with {provider.displayName || provider.name}
        </button>
      ))}
    </div>
  );
}
```

### OAuth2 Callback Page

```tsx
// pages/auth/callback.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '@@uauth/core/react';
import { useNavigate } from 'react-router-dom';

function OAuthCallback() {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const result = await auth.oauth2.handleCallback();

      if (result.ok) {
        navigate('/dashboard');
      } else if (result.error?.code !== 'POPUP_FLOW') {
        // POPUP_FLOW means popup handled it, not an error
        setError(result.error?.message || 'Authentication failed');
      }
    };

    handleCallback();
  }, [auth, navigate]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <div>Completing sign in...</div>;
}
```

## Security Considerations

### Defense in Depth

The SDK implements multiple security layers:

1. **Random Passwords for OAuth Users**: OAuth users get a cryptographically random password stored in the database. Even if there's a bug in authentication logic, attackers can't guess this password.

2. **Blocked Password Login**: OAuth users are explicitly blocked from password login:
   ```python
   def authenticate_user(db, email, password):
       user = db.query(User).filter(User.email == email).first()
       if user.oauth_provider:  # Block OAuth users
           return None
       # ... password verification
   ```

3. **State Parameter**: CSRF protection via OAuth2 state parameter, validated on callback.

4. **Origin Validation**: Popup messages are validated against origin.

### Client Secrets

- Client secrets are **never** sent to the frontend
- `GET /auth/providers` only returns public configuration (client_id, scopes)
- Code exchange happens server-side with the secret

### Account Linking

By default, if a user signs up with password and later tries OAuth with the same email:
- The account is upgraded to OAuth
- Password login is disabled
- A new random password is generated

If a user has an OAuth account and tries to use a different provider:
- Sign in is blocked with `ACCOUNT_EXISTS` error
- Message indicates which provider the account uses

## API Reference

### Backend Endpoints

#### GET /auth/providers
Returns available OAuth2 providers with public configuration.

**Response:**
```json
{
  "ok": true,
  "data": {
    "providers": [
      {
        "name": "google",
        "displayName": "Google",
        "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth",
        "clientId": "your-public-client-id",
        "scope": "openid email profile"
      }
    ]
  }
}
```

#### POST /auth/sign-in/oauth2
Exchange OAuth2 authorization code for user tokens.

**Request:**
```json
{
  "provider": "google",
  "code": "authorization-code-from-oauth-provider",
  "redirect_uri": "http://localhost:5173/auth/callback"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "email": "user@example.com",
      "name": "User Name"
    },
    "tokens": {
      "access_token": "eyJ...",
      "refresh_token": "ref_...",
      "expires_in": 3600
    }
  }
}
```

### Client SDK Methods

```typescript
// Load providers from backend
await auth.oauth2.loadProviders(): Promise<OAuth2Provider[]>

// Get cached providers
auth.oauth2.getProviders(): OAuth2Provider[]

// Sign in with popup window
await auth.oauth2.signInWithPopup(options: OAuth2FlowOptions): Promise<ApiResponse<SignInData>>

// Sign in with redirect
await auth.oauth2.signInWithRedirect(options: OAuth2FlowOptions): Promise<void>

// Handle OAuth callback
await auth.oauth2.handleCallback(params?: URLSearchParams): Promise<ApiResponse<SignInData>>

// Get authorization URL (advanced)
auth.oauth2.getAuthorizationUrl(options: OAuth2FlowOptions): string
```

### OAuth2FlowOptions

```typescript
interface OAuth2FlowOptions {
  provider: string;           // Provider name (e.g., 'google', 'github')
  redirectUri?: string;       // Override redirect URI
  state?: string;             // Custom state (auto-generated if not provided)
  scope?: string;             // Override scopes
  popup?: boolean;            // Internal use
  popupWidth?: number;        // Popup width (default: 500)
  popupHeight?: number;       // Popup height (default: 600)
}
```

## Adding Custom Providers

### Backend

Add to `oauth2_utils.py`:

```python
OAUTH2_PROVIDERS["custom"] = OAuth2ProviderConfig(
    name="custom",
    display_name="Custom Provider",
    authorization_url="https://custom.com/oauth/authorize",
    token_url="https://custom.com/oauth/token",
    userinfo_url="https://custom.com/api/userinfo",
    client_id=settings.custom_client_id,
    client_secret=settings.custom_client_secret,
    scope="email profile",
)
```

Add to `exchange_oauth2_code()` function:

```python
elif provider_name == "custom":
    return {
        "email": userinfo.get("email"),
        "name": userinfo.get("full_name"),
        "provider_user_id": str(userinfo.get("user_id")),
        "provider": provider_name,
    }
```

## Troubleshooting

### Common Issues

**1. "OAuth2 provider not found"**
- Ensure providers are loaded: `await auth.oauth2.loadProviders()`
- Check backend has provider configured with valid client_id/secret

**2. "POPUP_BLOCKED"**
- Ensure popup is triggered by user action (click event)
- Check browser popup settings

**3. "STATE_MISMATCH"**
- Clear localStorage and try again
- Ensure redirect URI matches exactly

**4. "ACCOUNT_EXISTS"**
- User already has account with different OAuth provider
- Either use original provider or implement account linking

**5. "Failed to exchange code"**
- Verify client_secret is correct
- Check redirect_uri matches OAuth app settings exactly
- Ensure code hasn't expired (usually valid for ~10 minutes)
