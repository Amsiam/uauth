# Universal Auth SDK

> **One auth SDK. Any backend. Your data.**

Universal Auth SDK is a lightweight, framework-agnostic authentication library that works with ANY backend. Instead of vendor lock-in, we provide a standard REST contract that any backend can implement.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## The Problem

Every auth provider ships their own SDK that only works with their backend:
- **Clerk** - only works with Clerk
- **Supabase** - only works with Supabase
- **Auth0** - only works with Auth0

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

- **Tiny bundle** - < 3kb gzipped
- **Framework integrations** - React hooks, Next.js SSR
- **Auto token refresh** - Handles 401 automatically
- **TypeScript** - Full type safety
- **Works everywhere** - React, Next.js, React Native, Vue, Svelte
- **Plugin system** - OAuth2, magic links, 2FA (all optional)

### For Backend Developers

- **No vendor lock-in** - Own your infrastructure
- **Any database** - Postgres, MySQL, MongoDB, etc.
- **Any framework** - FastAPI, Django, Express, Go, Rails
- **Full control** - Implement auth your way
- **Standard contract** - Just 5 required endpoints

## Quick Start

### Installation

```bash
# Core SDK
npm install @nightmar3/uauth-core

# React hooks (optional)
npm install @nightmar3/uauth-react

# Next.js integration (optional)
npm install @nightmar3/uauth-next

# Server utilities (optional)
npm install @nightmar3/uauth-server
```

### Basic Usage

```typescript
import { createAuth } from '@nightmar3/uauth-core'

const auth = createAuth({
  baseURL: 'https://api.yourapp.com/auth',
  storage: localStorage,
})

// Sign in
const result = await auth.signIn('password', {
  email: 'alice@example.com',
  password: 'secret123',
})

if (result.ok) {
  console.log('Logged in:', result.data.user)
}
```

### React Hooks

```tsx
import { createAuth, createOAuth2Plugin } from '@nightmar3/uauth-core'
import { AuthProvider, useAuth } from '@nightmar3/uauth-react'

const auth = createAuth({
  baseURL: 'https://api.yourapp.com/auth',
})

// Optional: Add OAuth support
const plugins = [createOAuth2Plugin()]

function App() {
  return (
    <AuthProvider auth={auth} plugins={plugins}>
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

### Next.js (App Router)

```tsx
// app/providers.tsx
'use client'

import { AuthProvider, createOAuth2Plugin } from '@nightmar3/uauth-next'

// Optional: Add OAuth support
const plugins = [createOAuth2Plugin()]

export function Providers({ children }) {
  return (
    <AuthProvider plugins={plugins}>
      {children}
    </AuthProvider>
  )
}
```

```tsx
// app/dashboard/page.tsx
import { getSession } from '@nightmar3/uauth-next/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return <div>Welcome {session.user.name}</div>
}
```

## OAuth2 (Optional)

OAuth is completely optional. If you only need email/password, skip this section entirely - **no extra network requests will be made**.

### Add OAuth Support

```tsx
import { createOAuth2Plugin } from '@nightmar3/uauth-core'
import { AuthProvider, useOAuth } from '@nightmar3/uauth-react'

// Add plugin to enable OAuth
const plugins = [createOAuth2Plugin()]

function App() {
  return (
    <AuthProvider auth={auth} plugins={plugins}>
      <LoginPage />
    </AuthProvider>
  )
}

function LoginPage() {
  const { providers, signInWithOAuth } = useOAuth()

  return (
    <div>
      {providers.map((p) => (
        <button key={p.name} onClick={() => signInWithOAuth(p.name)}>
          Continue with {p.displayName}
        </button>
      ))}
    </div>
  )
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

- **FastAPI** (Python) - `backends/fastapi/`
- **Django** (coming soon)
- **Express** (coming soon)
- **Go** (coming soon)

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
| `@nightmar3/uauth-core` | Core SDK | < 3kb |
| `@nightmar3/uauth-react` | React hooks | < 2kb |
| `@nightmar3/uauth-next` | Next.js integration | < 2kb |
| `@nightmar3/uauth-server` | Server utilities | < 1kb |

## Documentation

- [Core SDK API](packages/core/README.md)
- [React Hooks](packages/react/README.md)
- [Next.js Integration](packages/next/README.md)
- [Server Utilities](packages/server/README.md)
- [FastAPI Backend](backends/fastapi/README.md)

## Plugin System

Extend the SDK with optional plugins:

```typescript
import { createAuth, createOAuth2Plugin } from '@nightmar3/uauth-core'
import { AuthProvider } from '@nightmar3/uauth-react'

const auth = createAuth({ baseURL: '...' })

// Add only the features you need
const plugins = [
  createOAuth2Plugin(),  // OAuth2 support
  // createMagicLinkPlugin(),  // Coming soon
  // createTOTPPlugin(),       // Coming soon
]

function App() {
  return (
    <AuthProvider auth={auth} plugins={plugins}>
      <YourApp />
    </AuthProvider>
  )
}
```

Or create custom plugins:

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
      },
    }
  },
}

auth.plugin('totp', totpPlugin)
await auth.totp.enable()
```

## Comparison

| Feature | Universal Auth | NextAuth | Clerk | Supabase |
|---------|---------------|----------|-------|----------|
| Backend flexibility | Any | Any | Clerk only | Supabase only |
| Data ownership | Full | Full | No | Partial |
| Bundle size | 3kb | 50kb+ | 100kb+ | 30kb |
| Self-hosted | Yes | Yes | No | Limited |
| Plugin system | Yes | Limited | No | No |
| OAuth optional | Yes | Yes | No | No |

## Contributing

Contributions welcome! Please read our [contributing guide](CONTRIBUTING.md).

## License

MIT License - see [LICENSE](LICENSE) for details

## Roadmap

### Phase 1: MVP (v1.0)
- [x] Core SDK
- [x] React hooks
- [x] Next.js integration
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

- [Documentation](packages/)
- [Issue Tracker](https://github.com/universal-auth/sdk/issues)
- [Discussions](https://github.com/universal-auth/sdk/discussions)

---

**Built with care for developers who want to own their auth infrastructure**
