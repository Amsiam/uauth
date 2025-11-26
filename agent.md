# Universal Auth SDK - Complete Specification

## The Problem

**Current State of Auth SDKs:**
- Clerk SDK → only works with Clerk backend (vendor lock-in)
- Supabase Auth → only works with Supabase (database lock-in)
- NextAuth → messy API, inconsistent backend integrations
- Auth0 → expensive, no data ownership
- DIY solutions → everyone reinvents token refresh, session handling, etc.

**The Core Issue:**
Every auth provider ships their own frontend SDK that only works with their specific backend. If you want to switch backends or own your auth infrastructure, you must rewrite all frontend auth code.

## The Solution

**Universal Auth SDK = One frontend SDK that works with ANY backend**

Think of it like this:
- **Stripe** = one frontend SDK, works with any payment backend that implements their API
- **Universal Auth** = one frontend SDK, works with any auth backend that implements our contract

### Key Insight

Auth flows are 95% identical across all apps:
1. User logs in → get tokens
2. User makes requests → attach tokens
3. Token expires → refresh automatically
4. User logs out → clear tokens

**Why should every backend ship a different SDK for this?**

Instead: Define a **standard REST contract** that any backend can implement. Ship one polished, tiny SDK that works with all of them.

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         React/Next.js Frontend          │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   Universal Auth SDK (3kb)        │ │
│  │                                   │ │
│  │  - signIn()  - signOut()         │ │
│  │  - session() - refresh()         │ │
│  │  - Auto token attach             │ │
│  │  - Auto refresh on 401           │ │
│  └───────────────────────────────────┘ │
│              │                          │
│              │ Fixed REST Contract      │
│              ▼                          │
└─────────────────────────────────────────┘
               │
               │ HTTPS
               │
┌──────────────▼──────────────────────────┐
│     ANY Backend (your choice)           │
│                                         │
│  FastAPI / Django / Express / Go / etc. │
│                                         │
│  Just implement 10 standard endpoints:  │
│  POST /auth/sign-in/password           │
│  POST /auth/sign-up                    │
│  POST /auth/token/refresh              │
│  GET  /auth/session                    │
│  ...etc                                │
│                                         │
│  ✓ Use any database                    │
│  ✓ Use any token strategy (JWT/opaque)│
│  ✓ Add custom business logic           │
│  ✓ Full control over security          │
└─────────────────────────────────────────┘
```

---

## The Fixed REST Contract

This is the **core innovation**: a frozen, versioned API specification that all backends must implement.

### Base URL
Provided by developer: `https://api.yourapp.com/auth`

### Core Endpoints (v1 - frozen forever)

| Method | Endpoint | Request Body | Response | Description |
|--------|----------|--------------|----------|-------------|
| POST | `/sign-in/password` | `{email, password}` | `{tokens, user}` | Password authentication |
| POST | `/sign-up` | `{email, password, ...}` | `{tokens, user}` | Create new account |
| POST | `/token/refresh` | `{refresh_token}` | `{tokens}` | Rotate access token |
| GET | `/session` | - | `{user, org?, ...}` | Get current user |
| DELETE | `/session` | - | `{ok: true}` | Sign out (invalidate tokens) |

### Optional Plugin Endpoints

| Method | Endpoint | Description | Plugin Name |
|--------|----------|-------------|-------------|
| POST | `/sign-in/oauth2/:provider` | OAuth flow (Google, GitHub, etc.) | `oauth2` |
| POST | `/sign-in/magic-link` | Send magic link to email | `magic-link` |
| POST | `/otp/send` | Send 2FA code | `totp` |
| POST | `/otp/verify` | Verify 2FA code | `totp` |

### Standard Response Envelope

**ALL endpoints must return this format:**

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "usr_123",
      "email": "alice@example.com",
      "name": "Alice"
    },
    "tokens": {
      "access_token": "eyJhbGc...",
      "refresh_token": "eyJhbGc...",
      "expires_in": 3600
    }
  },
  "error": null
}
```

**Error response:**

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "The password you entered is incorrect",
    "details": {}
  }
}
```

### Token Delivery Methods

Backend must support BOTH:

1. **Bearer Token (header-based)**
   ```
   Authorization: Bearer eyJhbGc...
   ```

2. **Cookie-based (for SSR)**
   - Client sends: `Prefer: cookie` header
   - Server responds with: `Set-Cookie: auth_token=...; HttpOnly; Secure; SameSite=Strict`
   - CSRF protection required when using cookies

### Self-Documentation Endpoints

| Endpoint | Description |
|----------|-------------|
| `/.well-known/openapi.json` | OpenAPI spec for all endpoints |
| `/.well-known/auth-plugin-manifest.json` | List of supported optional features |

**Example manifest:**
```json
{
  "version": "1.0.0",
  "plugins": ["oauth2", "magic-link", "totp"],
  "oauth2_providers": ["google", "github"]
}
```

---

## Frontend SDK API

### Installation

```bash
npm install universal-auth-sdk
```

### Basic Usage

```javascript
import { createAuth } from 'universal-auth-sdk'

// Initialize once
const auth = createAuth({
  baseURL: 'https://api.yourapp.com/auth',
  storage: localStorage, // or sessionStorage, AsyncStorage, etc.
  fetch: customFetch     // optional: for React Native or custom fetch
})

// Sign in
const result = await auth.signIn('password', {
  email: 'alice@example.com',
  password: 'secret123'
})

if (result.ok) {
  console.log('Logged in:', result.data.user)
  // Tokens automatically stored, attached to future requests
}

// Get current session
const session = await auth.session()
console.log(session.data.user)

// Sign out
await auth.signOut()
```

### Core SDK Methods

```typescript
interface UniversalAuth {
  // Authentication
  signIn(method: 'password' | 'oauth2' | 'magic-link', payload: any): Promise<Result>
  signUp(payload: SignUpPayload): Promise<Result>
  signOut(): Promise<Result>
  
  // Session
  session(): Promise<Result>
  refresh(): Promise<Result>
  
  // Utilities
  isAuthenticated(): boolean
  getToken(): string | null
  
  // Plugin system
  plugin(name: string, pluginObject: Plugin): void
  
  // Low-level API access
  api: {
    req(path: string, body?: any, options?: RequestOptions): Promise<Result>
  }
}
```

### Built-in Features

1. **Automatic Token Attachment**
   - SDK automatically adds `Authorization: Bearer ...` to all requests
   - Or sends cookies if backend prefers

2. **Automatic Token Refresh**
   - On 401 response, SDK automatically:
     1. Calls `/token/refresh`
     2. Retries original request
     3. Only fails after refresh fails

3. **Storage Abstraction**
   - Works with localStorage, sessionStorage, AsyncStorage
   - Supports custom storage adapters

4. **SSR Support**
   - Cookie-based auth for Next.js server components
   - Hydration without flash of unauthenticated content

5. **TypeScript Support**
   - Full type definitions
   - Generic types for custom user objects

### React Hooks (Optional Package)

```javascript
import { useAuth } from 'universal-auth-sdk/react'

function ProfilePage() {
  const { user, isLoading, signOut } = useAuth()
  
  if (isLoading) return <div>Loading...</div>
  if (!user) return <div>Please log in</div>
  
  return (
    <div>
      <h1>Welcome {user.name}</h1>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

### Next.js Middleware Example

```javascript
// middleware.ts
import { createAuth } from 'universal-auth-sdk/server'

export async function middleware(request) {
  const auth = createAuth({
    baseURL: process.env.AUTH_API_URL,
    fetch: fetch
  })
  
  // Get session from cookie
  const session = await auth.session()
  
  if (!session.ok) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Attach user to request headers for downstream use
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', session.data.user.id)
  
  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  })
}
```

---

## Plugin System

Plugins extend the SDK without bloating the core.

### Creating a Plugin

```javascript
const totpPlugin = {
  name: 'totp',
  version: '1.0.0',
  
  install({ client, core, sdk }) {
    // Add methods to SDK instance
    sdk.totp = {
      async enable() {
        return client.req('/otp/send', {})
      },
      
      async verify(code) {
        return client.req('/otp/verify', { code })
      }
    }
  }
}

// Use plugin
auth.plugin('totp', totpPlugin)

// Now available
await auth.totp.enable()
await auth.totp.verify('123456')
```

### Plugin Discovery

SDK can automatically detect available plugins:

```javascript
const manifest = await auth.api.req('/.well-known/auth-plugin-manifest.json')

if (manifest.data.plugins.includes('oauth2')) {
  // OAuth is available
  await auth.signIn('oauth2', { provider: 'google' })
}
```

---

## Backend Implementation Guide

### Step 1: Choose Your Framework

Universal Auth SDK works with ANY backend. Examples:
- **FastAPI** (Python)
- **Django** (Python)
- **Express** (Node.js)
- **Go** (net/http)
- **Rails** (Ruby)

### Step 2: Implement Required Endpoints

You must implement these 5 endpoints minimum:

1. `POST /auth/sign-in/password`
2. `POST /auth/sign-up`
3. `POST /auth/token/refresh`
4. `GET /auth/session`
5. `DELETE /auth/session`

### Step 3: Follow Response Format

Always return the standard envelope:

```python
# FastAPI example
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class AuthResponse(BaseModel):
    ok: bool
    data: dict | None = None
    error: dict | None = None

@app.post("/auth/sign-in/password")
async def sign_in(email: str, password: str):
    # Your authentication logic
    user = authenticate_user(email, password)
    
    if not user:
        return AuthResponse(
            ok=False,
            error={
                "code": "INVALID_CREDENTIALS",
                "message": "Email or password is incorrect"
            }
        )
    
    tokens = generate_tokens(user)
    
    return AuthResponse(
        ok=True,
        data={
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name
            },
            "tokens": {
                "access_token": tokens.access,
                "refresh_token": tokens.refresh,
                "expires_in": 3600
            }
        }
    )
```

### Step 4: Handle Token Refresh

```python
@app.post("/auth/token/refresh")
async def refresh_token(refresh_token: str):
    try:
        # Verify refresh token
        payload = verify_jwt(refresh_token)
        user = get_user(payload['user_id'])
        
        # Generate new access token
        new_access_token = create_access_token(user)
        
        return AuthResponse(
            ok=True,
            data={
                "tokens": {
                    "access_token": new_access_token,
                    "refresh_token": refresh_token,  # Can rotate or keep same
                    "expires_in": 3600
                }
            }
        )
    except:
        return AuthResponse(
            ok=False,
            error={"code": "INVALID_TOKEN", "message": "Refresh token is invalid"}
        )
```

### Step 5: Implement Session Endpoint

```python
@app.get("/auth/session")
async def get_session(authorization: str = Header(None)):
    # Extract token from "Bearer {token}"
    token = authorization.replace("Bearer ", "")
    
    try:
        payload = verify_jwt(token)
        user = get_user(payload['user_id'])
        
        return AuthResponse(
            ok=True,
            data={
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "name": user.name
                }
            }
        )
    except:
        return AuthResponse(
            ok=False,
            error={"code": "UNAUTHORIZED", "message": "Invalid or expired token"}
        )
```

### Security Checklist

- [ ] Hash passwords with bcrypt/argon2 (NEVER store plaintext)
- [ ] Use secure random tokens for refresh tokens
- [ ] Set short expiry on access tokens (15 min - 1 hour)
- [ ] Implement token rotation on refresh
- [ ] Use HTTPS only in production
- [ ] Set `HttpOnly`, `Secure`, `SameSite=Strict` on cookies
- [ ] Implement CSRF protection for cookie-based auth
- [ ] Rate limit authentication endpoints
- [ ] Log authentication events for audit

---

## Conformance Testing

### Test Your Backend Implementation

```bash
npm install -g universal-auth-test-suite

# Test your backend
npx uats test https://api.yourapp.com/auth

# Output:
✓ POST /sign-in/password returns correct format
✓ Token refresh works correctly
✓ Session endpoint requires valid token
✓ Error responses use standard format
✓ CORS headers configured correctly

Your backend is Universal Auth compliant! 🎉
```

### Add Compliance Badge

```markdown
![Universal Auth Compliant](https://img.shields.io/badge/Universal%20Auth-v1.0-blue)
```

---

## Versioning Strategy

### Contract Versioning

- v1.x = current spec (frozen forever)
- Breaking changes → v2.x → new base path `/v2/auth/...`
- Old versions supported indefinitely

### SDK Versioning

- SDK major version matches contract version
- `universal-auth-sdk@1.x` works with `/v1/auth/...` backends
- `universal-auth-sdk@2.x` works with `/v2/auth/...` backends

### Plugin Versioning

- Plugins declare min/max SDK version compatibility
- SDK warns if plugin calls unsupported endpoints

---

## Why This Approach Wins

### For Frontend Developers

✅ **One SDK to learn** - works with any backend
✅ **Tiny bundle size** - < 3kb gzipped
✅ **Best practices built-in** - token refresh, storage, SSR
✅ **Framework integrations** - React hooks, Next.js middleware
✅ **TypeScript support** - full type safety

### For Backend Developers

✅ **No vendor lock-in** - own your auth infrastructure
✅ **Use any database** - Postgres, MySQL, MongoDB, etc.
✅ **Any framework** - FastAPI, Django, Express, Go, Rails
✅ **Full control** - implement business logic your way
✅ **Security best practices** - reference implementations provided

### For Organizations

✅ **Data ownership** - auth data stays in your database
✅ **Cost control** - no per-user pricing
✅ **Compliance** - meet data residency requirements
✅ **Flexibility** - switch backends without frontend changes
✅ **Audit trail** - full visibility into auth events

---

## Comparison to Existing Solutions

| Feature | Universal Auth | NextAuth | Clerk | Supabase | Auth0 |
|---------|---------------|----------|-------|----------|-------|
| Backend flexibility | ✅ Any | ✅ Any | ❌ Clerk only | ❌ Supabase only | ❌ Auth0 only |
| Data ownership | ✅ Full | ✅ Full | ❌ No | ⚠️ Partial | ❌ No |
| Bundle size | 3kb | 50kb+ | 100kb+ | 30kb | 80kb+ |
| SSR support | ✅ Built-in | ⚠️ Complex | ✅ Yes | ✅ Yes | ✅ Yes |
| Self-hosted | ✅ Yes | ✅ Yes | ❌ No | ⚠️ Limited | ❌ No |
| Plugin system | ✅ Yes | ⚠️ Limited | ❌ No | ❌ No | ⚠️ Limited |
| Pricing | 🆓 Free | 🆓 Free | 💰 $$$ | 💰 $$ | 💰 $$$$ |

---

## Roadmap

### Phase 1: MVP (v1.0)
- [ ] Core SDK implementation
- [ ] FastAPI reference backend
- [ ] Django reference backend
- [ ] React hooks package
- [ ] Next.js middleware examples
- [ ] Conformance test suite

### Phase 2: Ecosystem (v1.1)
- [ ] OAuth2 plugin
- [ ] Magic link plugin
- [ ] TOTP/2FA plugin
- [ ] TanStack Query integration
- [ ] Vue.js support
- [ ] Svelte support

### Phase 3: Enterprise (v1.2)
- [ ] SAML plugin
- [ ] LDAP plugin
- [ ] Audit logging standardization
- [ ] Session management dashboard
- [ ] Multi-tenancy patterns

---

## Getting Started

### As a Frontend Developer

```bash
npm install universal-auth-sdk

# Point it at any compliant backend
const auth = createAuth({
  baseURL: 'https://api.yourapp.com/auth'
})
```

### As a Backend Developer

1. Choose your framework (FastAPI, Django, etc.)
2. Copy reference implementation
3. Customize for your needs
4. Run conformance tests
5. Deploy

### As an Organization

1. Review security requirements
2. Choose backend framework
3. Implement contract
4. Deploy to your infrastructure
5. Use SDK in all frontend apps

---

## FAQ

**Q: Is this production-ready?**
A: This is a specification. Reference implementations are minimal examples. Production deployment requires security hardening.

**Q: Can I use this with mobile apps?**
A: Yes! Works with React Native, Flutter web views, or any platform that can make HTTP requests.

**Q: What about passkeys/WebAuthn?**
A: Add as a plugin! The contract is extensible without breaking changes.

**Q: Do I need to use JWT?**
A: No. Use JWT, opaque tokens, or any token strategy. The SDK doesn't care.

**Q: Can I add custom fields to responses?**
A: Yes! The contract defines minimum fields. Add whatever you need.

**Q: What if I need custom auth flows?**
A: Add custom endpoints. Use `auth.api.req()` for non-standard calls.

---

## Summary

**Universal Auth SDK solves the fragmentation problem in authentication:**

Instead of every auth provider shipping their own incompatible SDK, we define ONE standard REST contract that any backend can implement. Frontend developers get a tiny, polished SDK that works everywhere. Backend developers get full control without reinventing the wheel.

**It's not a hosted service. It's not a library. It's a standard.**

Like HTTP, REST, or GraphQL—it's a protocol that brings order to chaos.

---

## Tagline

**"One auth SDK. Any backend. Your data."**

---

*This specification is designed to be implementation-agnostic and can be built by any developer or AI system with knowledge of REST APIs, authentication patterns, and frontend SDK design.*