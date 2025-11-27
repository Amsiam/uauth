# Universal Auth SDK

> **One auth SDK. Any backend. Your data.**

Universal Auth SDK is a lightweight, framework-agnostic authentication library that works with ANY backend. Instead of vendor lock-in, we provide a standard REST contract that any backend can implement.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## The Problem

Every auth provider ships their own SDK that only works with their backend:
- **Clerk** → only works with Clerk
- **Supabase** → only works with Supabase
- **Auth0** → only works with Auth0

Switching backends means rewriting all your frontend auth code.

## The Solution

Universal Auth SDK defines a **standard REST contract** that any backend can implement. One tiny SDK (< 3kb) works with all compliant backends.

```typescript
// Use the same SDK with ANY backend
const auth = createAuth({
  baseURL: 'https://api.yourapp.com/auth'  // Your backend
})

// Sign in
await auth.signIn('password', { email, password })

// Get session
const { data } = await auth.session()

// Sign out
await auth.signOut()
```

## Features

### For Frontend Developers

✅ **Tiny bundle** - < 3kb gzipped
✅ **Framework integrations** - React hooks, Next.js SSR
✅ **Auto token refresh** - Handles 401 automatically
✅ **TypeScript** - Full type safety
✅ **Works everywhere** - React, Next.js, React Native, Vue, Svelte

### For Backend Developers

✅ **No vendor lock-in** - Own your infrastructure
✅ **Any database** - Postgres, MySQL, MongoDB, etc.
✅ **Any framework** - FastAPI, Django, Express, Go, Rails
✅ **Full control** - Implement auth your way
✅ **Standard contract** - Just 5 required endpoints

## Quick Start

### Installation

```bash
# Core SDK
npm install @uauth/core

# React hooks (optional)
npm install @uauth/react

# Server utilities (optional)
npm install @uauth/server
```

### Basic Usage

```typescript
import { createAuth } from '@uauth/core'

const auth = createAuth({
  baseURL: 'https://api.yourapp.com/auth',
  storage: localStorage
})

// Sign in
const result = await auth.signIn('password', {
  email: 'alice@example.com',
  password: 'secret123'
})

if (result.ok) {
  console.log('Logged in:', result.data.user)
}
```

### React Hooks

```tsx
import { AuthProvider, useAuth } from '@uauth/react'
import { createAuth } from '@uauth/core'

const auth = createAuth({
  baseURL: 'https://api.yourapp.com/auth'
})

function App() {
  return (
    <AuthProvider auth={auth}>
      <YourApp />
    </AuthProvider>
  )
}

function Profile() {
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

### Next.js Server-Side

```typescript
import { createServerAuth, getServerSession } from '@uauth/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const auth = createServerAuth({
    baseURL: process.env.AUTH_API_URL!
  })

  const session = await getServerSession(auth, cookies)

  if (!session) {
    redirect('/login')
  }

  return <div>Hello {session.user.name}</div>
}
```

## The REST Contract

Your backend must implement these 5 endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/sign-in/password` | POST | Password authentication |
| `/auth/sign-up` | POST | Create account |
| `/auth/token/refresh` | POST | Refresh access token |
| `/auth/session` | GET | Get current user |
| `/auth/session` | DELETE | Sign out |

### Standard Response Format

All endpoints return:

```json
{
  "ok": true,
  "data": {
    "user": { "id": "...", "email": "..." },
    "tokens": {
      "access_token": "...",
      "refresh_token": "...",
      "expires_in": 3600
    }
  },
  "error": null
}
```

## Backend Implementations

We provide reference implementations:

- ✅ **FastAPI** (Python) - `backends/fastapi/`
- 🚧 **Django** (coming soon)
- 🚧 **Express** (coming soon)
- 🚧 **Go** (coming soon)

### Running the FastAPI Backend

```bash
cd backends/fastapi
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

Backend runs on `http://localhost:8000`

## Packages

| Package | Description | Size |
|---------|-------------|------|
| `@uauth/core` | Core SDK | < 3kb |
| `@uauth/react` | React hooks | < 2kb |
| `@uauth/server` | Server utilities | < 1kb |

## Documentation

- [Core SDK API](packages/core/README.md)
- [React Hooks](packages/react/README.md)
- [Server Utilities](packages/server/README.md)
- [FastAPI Backend](backends/fastapi/README.md)
- [Full Specification](agen.md)

## Plugin System

Extend the SDK with plugins:

```typescript
const totpPlugin = {
  name: 'totp',
  version: '1.0.0',
  install({ sdk, client }) {
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

auth.plugin('totp', totpPlugin)
await auth.totp.enable()
```

## Comparison

| Feature | Universal Auth | NextAuth | Clerk | Supabase |
|---------|---------------|----------|-------|----------|
| Backend flexibility | ✅ Any | ✅ Any | ❌ Clerk only | ❌ Supabase only |
| Data ownership | ✅ Full | ✅ Full | ❌ No | ⚠️ Partial |
| Bundle size | 3kb | 50kb+ | 100kb+ | 30kb |
| Self-hosted | ✅ Yes | ✅ Yes | ❌ No | ⚠️ Limited |
| Plugin system | ✅ Yes | ⚠️ Limited | ❌ No | ❌ No |

## Contributing

Contributions welcome! Please read our [contributing guide](CONTRIBUTING.md).

## License

MIT License - see [LICENSE](LICENSE) for details

## Roadmap

### Phase 1: MVP (v1.0) ✅
- [x] Core SDK
- [x] React hooks
- [x] Server utilities
- [x] FastAPI backend

### Phase 2: Ecosystem (v1.1)
- [x] OAuth2 plugin
- [ ] Magic link plugin
- [ ] TOTP/2FA plugin
- [ ] Django backend
- [ ] Express backend

### Phase 3: Enterprise (v1.2)
- [ ] SAML plugin
- [ ] Session management dashboard
- [ ] Multi-tenancy patterns

## Support

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/universal-auth/sdk/issues)
- 💬 [Discussions](https://github.com/universal-auth/sdk/discussions)

---

**Built with ❤️ for developers who want to own their auth infrastructure**
