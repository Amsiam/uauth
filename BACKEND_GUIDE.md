# Building a Compatible Backend

This guide explains how to build a backend that works with the Universal Auth SDK. You can build your backend in **any language** (Node.js, Python, Go, PHP, etc.) as long as it follows this guide.

## The Core Concept

The Universal Auth SDK acts as a **client** that talks to your backend. It handles:
1.  Sending credentials to your backend.
2.  Receiving tokens (Access & Refresh tokens).
3.  Storing tokens automatically.
4.  Attaching tokens to future requests.

**Your Backend's Job** is to:
1.  Verify credentials (check email/password).
2.  Issue JWTs (JSON Web Tokens).
3.  Validate tokens on protected routes.

---

## Step-by-Step Implementation

### 1. Sign In (`POST /sign-in/password`)

**Goal:** Verify user and return tokens.

**Logic:**
1.  Receive `email` and `password` from the request body.
2.  Look up the user in your database.
3.  Verify the password hash (e.g., using bcrypt/argon2).
4.  If valid, generate two JWTs:
    *   **Access Token**: Short-lived (e.g., 15-60 mins). Contains user ID.
    *   **Refresh Token**: Long-lived (e.g., 7-30 days). Contains user ID and a version/family ID for revocation.
5.  Return them in the JSON response.

**Example Response:**
```json
{
  "ok": true,
  "data": {
    "user": { "id": "123", "email": "alice@example.com", "name": "Alice" },
    "tokens": {
      "access_token": "eyJhbG...",
      "refresh_token": "d7s8f...",
      "expires_in": 3600
    }
  },
  "error": null
}
```

### 2. Get Session (`GET /session`)

**Goal:** Return the current user's profile.

**Logic:**
1.  Check the `Authorization` header for the Bearer token (sent automatically by the SDK).
    *   Header format: `Authorization: Bearer <access_token>`
2.  Verify the Access Token signature and expiration.
3.  If valid, decode the user ID from the token.
4.  Fetch the latest user data from your database.
5.  Return the user object.

**Example Response:**
```json
{
  "ok": true,
  "data": {
    "user": { "id": "123", "email": "alice@example.com", "name": "Alice" }
  },
  "error": null
}
```

### 3. Refresh Token (`POST /token/refresh`)

**Goal:** Issue a new Access Token using a valid Refresh Token.

**Logic:**
1.  Receive `refresh_token` from the request body.
2.  Verify the Refresh Token signature and expiration.
3.  Check if the Refresh Token has been revoked in your database.
4.  If valid, generate a **new** Access Token (and optionally a new Refresh Token).
5.  Return the new tokens.

**Example Response:**
```json
{
  "ok": true,
  "data": {
    "tokens": {
      "access_token": "new_access_token...",
      "refresh_token": "new_refresh_token...",
      "expires_in": 3600
    }
  },
  "error": null
}
```

### 4. Sign Out (`DELETE /session`)

**Goal:** Revoke the user's session.

**Logic:**
1.  Receive the `Authorization` header (Access Token) or `refresh_token` in the body.
2.  Mark the Refresh Token as revoked in your database (blacklist it).
3.  Return success.

### 5. OAuth2 Support (Optional)

If you want to support OAuth (Google, GitHub, etc.), implement these two endpoints.

#### A. List Providers (`GET /providers`)

**Goal:** Tell the frontend which providers are available.

**Logic:**
1.  Return a list of configured providers with their names, display names, and OAuth configuration (client ID, auth URL).

**Example Response:**
```json
{
  "ok": true,
  "data": {
    "providers": [
      { 
        "name": "google", 
        "displayName": "Google",
        "clientId": "your-google-client-id",
        "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth",
        "scope": "openid email profile"
      },
      { 
        "name": "github", 
        "displayName": "GitHub",
        "clientId": "your-github-client-id",
        "authorizationUrl": "https://github.com/login/oauth/authorize",
        "scope": "read:user user:email"
      }
    ]
  },
  "error": null
}
```

#### B. OAuth Sign In (`POST /sign-in/oauth2`)

**Goal:** Exchange an authorization code for user tokens.

**Logic:**
1.  Receive `provider` (e.g., "google"), `code`, and `redirect_uri` from the body.
2.  **Verify with Provider:** Call the provider's token endpoint (e.g., `https://oauth2.googleapis.com/token`) to exchange the `code` for the user's profile/email.
3.  **Find or Create User:** Look up the user by email in your database. If they don't exist, create them.
4.  **Generate Tokens:** Create Access and Refresh tokens for this user (same as password sign-in).
5.  Return the tokens.

**Example Response:**
```json
{
  "ok": true,
  "data": {
    "user": { "id": "123", "email": "alice@gmail.com", "name": "Alice" },
    "tokens": { "access_token": "...", "refresh_token": "...", "expires_in": 3600 }
  },
  "error": null
}
```

---

## Example Implementation (Node.js / Express)

Here is a minimal example of how your backend code might look using Express.js.

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = express();

app.use(express.json());

// 1. Sign In
app.post('/sign-in/password', async (req, res) => {
  const { email, password } = req.body;
  
  // TODO: Fetch user from DB
  const user = await db.findUser(email);
  
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    return res.status(401).json({ 
      ok: false, 
      data: null, 
      error: { code: 'AUTH_FAILED', message: 'Invalid credentials' } 
    });
  }

  // Generate Tokens
  const accessToken = jwt.sign({ sub: user.id }, 'access-secret', { expiresIn: '1h' });
  const refreshToken = jwt.sign({ sub: user.id }, 'refresh-secret', { expiresIn: '7d' });

  res.json({
    ok: true,
    data: {
      user: { id: user.id, email: user.email },
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600
      }
    },
    error: null
  });
});

// 2. Get Session
app.get('/session', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, 'access-secret');
    // TODO: Fetch fresh user data
    const user = await db.getUser(decoded.sub);
    
    res.json({
      ok: true,
      data: { user },
      error: null
    });
  } catch (err) {
    res.status(401).json({ 
      ok: false, 
      data: null, 
      error: { code: 'INVALID_TOKEN', message: 'Token expired or invalid' } 
    });
  }
});

app.listen(8000, () => console.log('Backend running on port 8000'));
```

## FAQ

### Do I need to handle cookies?
**No.** The SDK handles cookie storage for you in the frontend application (Next.js/TanStack Start). Your backend API just needs to return the tokens in the JSON body.

### Can I use my existing backend?
**Yes.** You just need to add these endpoints or create a wrapper/adapter that matches this JSON format.

### Where does this backend run?
It can run anywhere:
- A separate server (e.g., `api.myapp.com` running Python/Go/Node).
- Serverless functions (e.g., AWS Lambda, Vercel Functions).
- Next.js API Routes (e.g., `pages/api/auth/...`).
