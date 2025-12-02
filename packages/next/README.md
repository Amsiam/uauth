# @nightmar3/uauth-next

Next.js integration for Universal Auth SDK. Provides seamless authentication with minimal setup.

> [!IMPORTANT]
> **Backend Required:** This SDK requires a backend API. See [Backend Requirements](#backend-requirements) for the complete API contract, or use our [Backend Implementation Guide](../../BACKEND_GUIDE.md) for step-by-step instructions.

## Setup Guide

### Step 1: Install the Package

```bash
npm install @nightmar3/uauth-next
```

### Step 2: Set Environment Variable

Create a `.env.local` file in your Next.js project root:

```env
NEXT_PUBLIC_AUTH_URL=http://localhost:8000/auth
```

### Step 3: Add AuthProvider to Layout

Wrap your application with the `AuthProvider`:

```tsx
// app/layout.tsx
import { AuthProvider } from '@nightmar3/uauth-next'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
```

**With OAuth (optional):** If you need OAuth authentication, pass plugins:

```tsx
import { AuthProvider, createOAuth2Plugin } from '@nightmar3/uauth-next'

const plugins = [createOAuth2Plugin()]

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider plugins={plugins}>{children}</AuthProvider>
      </body>
    </html>
  )
}
```

### Step 4: Create Login Page

```tsx
// app/login/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@nightmar3/uauth-next'

export default function LoginPage() {
  const router = useRouter()
  const { user, isLoading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace('/dashboard')
    }
  }, [user, router])

  if (isLoading || user) {
    return <div>Loading...</div>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await signIn(email, password)
    if (result.ok) {
      router.replace('/dashboard')
    } else {
      setError(result.error?.message || 'Sign in failed')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      {error && <p>{error}</p>}
      <button type="submit">Sign In</button>
    </form>
  )
}
```

### Step 5: Create Protected Dashboard

```tsx
// app/dashboard/page.tsx
import { getSession } from '@nightmar3/uauth-next/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {session.user.name || session.user.email}</p>
    </div>
  )
}
```

### Step 6: Add Sign Out Button

```tsx
// components/sign-out-button.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@nightmar3/uauth-next'

export function SignOutButton() {
  const router = useRouter()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    router.replace('/login')
  }

  return <button onClick={handleSignOut}>Sign Out</button>
}
```

### Step 7 (Optional): Add Route Protection Middleware

```ts
// middleware.ts
import { authMiddleware } from '@nightmar3/uauth-next/middleware'

export default authMiddleware({
  protectedRoutes: ['/dashboard', '/dashboard/**', '/settings/**'],
  loginUrl: '/login',
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

That's it! Your Next.js app now has full authentication support.

---

## Use Cases

### Email/Password Authentication

#### Sign In

```tsx
'use client'

import { useAuth } from '@nightmar3/uauth-next'

function LoginForm() {
  const { signIn } = useAuth()

  const handleSubmit = async (email: string, password: string) => {
    const result = await signIn(email, password)
    if (!result.ok) {
      console.error(result.error?.message)
    }
  }
}
```

#### Sign Up

```tsx
'use client'

import { useAuth } from '@nightmar3/uauth-next'

function SignUpForm() {
  const { signUp } = useAuth()

  const handleSubmit = async (email: string, password: string, name: string) => {
    const result = await signUp({ email, password, name })
    if (!result.ok) {
      console.error(result.error?.message)
    }
  }
}
```

### OAuth Authentication (Optional)

OAuth is completely optional. If you don't need OAuth, skip this section entirely - no extra network requests will be made.

**No OAuth? No problem.** Just use `signIn` and `signUp` for email/password authentication.

To add OAuth support:

1. **Add the OAuth2 plugin to your provider:**

```tsx
// app/layout.tsx or components/providers.tsx
import { AuthProvider, createOAuth2Plugin } from '@nightmar3/uauth-next'

const plugins = [createOAuth2Plugin()]

export function Providers({ children }) {
  return <AuthProvider plugins={plugins}>{children}</AuthProvider>
}
```

2. **Use the `useOAuth` hook in your login page:**

```tsx
'use client'

import { useOAuth } from '@nightmar3/uauth-next'

function OAuthLogin() {
  const { providers, isLoading, signInWithOAuth } = useOAuth()

  // No OAuth configured on backend - don't render anything
  if (providers.length === 0) return null

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      {providers.map((provider) => (
        <button
          key={provider.name}
          onClick={() => signInWithOAuth(provider.name)}
        >
          Continue with {provider.displayName}
        </button>
      ))}
    </div>
  )
}
```

3. **Create a callback page for OAuth redirects:**

```tsx
// app/auth/callback/page.tsx
'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@nightmar3/uauth-next'

export default function CallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CallbackHandler />
    </Suspense>
  )
}

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const error = searchParams.get('error')

  useEffect(() => {
    if (user) router.replace('/dashboard')
  }, [user, router])

  if (error) {
    return <div>Error: {error}</div>
  }

  return <div>Completing sign in...</div>
}
```

### Server-Side Authentication

```tsx
// app/profile/page.tsx
import { getSession, getUser } from '@nightmar3/uauth-next/server'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div>
      <h1>{session.user.name}</h1>
      <p>{session.user.email}</p>
    </div>
  )
}
```

### Conditional UI Rendering

```tsx
import { SignedIn, SignedOut, AuthGate } from '@nightmar3/uauth-next'

function Header() {
  return (
    <nav>
      <SignedIn>
        <UserMenu />
      </SignedIn>
      <SignedOut>
        <LoginButton />
      </SignedOut>
    </nav>
  )
}

function ProtectedContent() {
  return (
    <AuthGate
      loading={<Spinner />}
      fallback={<p>Please sign in</p>}
    >
      <SecretContent />
    </AuthGate>
  )
}
```

### Custom User Type

```tsx
interface MyUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
}

// Client
const { user } = useAuth<MyUser>()

// Server
const session = await getSession<MyUser>()
```

### Token Refresh

#### Auto-refresh (Client-side)

By default, tokens are automatically refreshed before they expire. This happens silently in the background.

```tsx
// Default: auto-refresh enabled, refreshes 60 seconds before expiry
<AuthProvider>
  <App />
</AuthProvider>

// Customize when to refresh (e.g., 5 minutes before expiry)
<AuthProvider refreshBeforeExpiry={300}>
  <App />
</AuthProvider>

// Disable auto-refresh (not recommended)
<AuthProvider autoRefresh={false}>
  <App />
</AuthProvider>
```

**How it works:**
1. When user signs in or session loads, a timer is set based on token expiry
2. Token is refreshed automatically before it expires
3. On sign out, the timer is cleared
4. If refresh fails, the next API request will trigger a 401 → automatic refresh retry

#### Manual client-side refresh

```tsx
'use client'

import { useAuth } from '@nightmar3/uauth-next'

function RefreshButton() {
  const { refreshSession } = useAuth()

  const handleRefresh = async () => {
    await refreshSession()
    // Tokens are refreshed and user data is reloaded
  }

  return <button onClick={handleRefresh}>Refresh Session</button>
}
```

#### Server-side refresh

```tsx
// app/api/refresh/route.ts
import { refreshToken } from '@nightmar3/uauth-next/server'

export async function POST() {
  const result = await refreshToken()

  if (!result.ok) {
    return new Response('Token refresh failed', { status: 401 })
  }

  return Response.json({ ok: true })
}
```

#### Auto-refresh on server

`getSession()` automatically handles token refresh when it receives a 401 (unauthorized) response. If the access token is expired, it will:

1. Attempt to refresh tokens using the refresh token
2. Update the cookies with new tokens
3. Retry the session request with the new access token

This happens transparently - you just use `getSession()`:

```tsx
// app/dashboard/page.tsx
import { getSession } from '@nightmar3/uauth-next/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  // Automatically refreshes tokens on 401
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return <div>Welcome {session.user.name}</div>
}
```

---

## Backend Requirements

The SDK expects a backend API that implements the following endpoints. You can use our [FastAPI reference implementation](../../backends/fastapi) or build your own.

### Endpoints

| Method | Path | Description | Request Body | Response Data |
|--------|------|-------------|--------------|---------------|
| `POST` | `/sign-in/password` | Sign in with email/password | `{ email, password }` | `{ user, tokens }` |
| `POST` | `/sign-in/oauth2` | Exchange OAuth code for tokens | `{ provider, code, redirect_uri }` | `{ user, tokens }` |
| `POST` | `/sign-up` | Create new account | `{ email, password, name? }` | `{ user, tokens }` |
| `DELETE`| `/session` | Sign out (revoke tokens) | - | `{ ok: boolean }` |
| `GET` | `/session` | Get current user session | - | `{ user }` |
| `POST` | `/token/refresh` | Refresh access token | `{ refresh_token }` | `{ tokens }` |
| `GET` | `/providers` | List available OAuth providers | - | `{ providers }` |

### Response Format

All API responses must follow this envelope structure:

```typescript
interface ApiResponse<T> {
  ok: boolean
  data: T | null
  error: {
    code: string
    message: string
    details?: any
  } | null
}
```

### Token Structure

The backend must return tokens in this format:

```typescript
interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number // seconds
}
```

### OAuth Provider Response (Optional)

If implementing OAuth support, the `/providers` endpoint must return:

```typescript
interface OAuth2Provider {
  name: string
  displayName: string
  clientId: string
  authorizationUrl: string
  scope?: string
}
```

**Example:**
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
      }
    ]
  },
  "error": null
}
```

## API Reference

### Client (`@nightmar3/uauth-next`)

#### AuthProvider

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `plugins` | `Plugin[]` | `[]` | Plugins to install (e.g., OAuth2) |
| `loadOnMount` | `boolean` | `true` | Load session on mount |
| `autoRefresh` | `boolean` | `true` | Auto-refresh tokens before expiry |
| `refreshBeforeExpiry` | `number` | `60` | Seconds before expiry to refresh |

#### useAuth()

Returns:

| Property | Type | Description |
|----------|------|-------------|
| `user` | `User \| null` | Current user |
| `isLoading` | `boolean` | Loading state |
| `isAuthenticated` | `boolean` | Auth status |
| `error` | `Error \| null` | Auth error |
| `signIn` | `(email, password) => Promise` | Sign in |
| `signUp` | `(data) => Promise` | Create account |
| `signOut` | `() => Promise` | Sign out |
| `refreshSession` | `() => Promise` | Refresh tokens and reload session |
| `auth` | `UniversalAuth` | SDK instance |
| `getPlugin` | `(name) => Plugin` | Get installed plugin |

#### useOAuth() (requires OAuth2 plugin)

Returns:

| Property | Type | Description |
|----------|------|-------------|
| `providers` | `OAuth2Provider[]` | Available OAuth providers |
| `isLoading` | `boolean` | Providers loading state |
| `signInWithOAuth` | `(provider) => Promise` | Sign in with OAuth |

#### useUser()

Returns `User | null`

#### useSession()

Returns `{ user, accessToken } | null`

#### SignedIn / SignedOut

Render children based on auth state.

#### AuthGate

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Shown when authenticated |
| `fallback` | `ReactNode` | Shown when not authenticated |
| `loading` | `ReactNode` | Shown while loading |

### Server (`@nightmar3/uauth-next/server`)

#### getSession()

Get the current session. Automatically refreshes tokens on 401 response.

```ts
const session = await getSession<User>()
// Returns: { user, accessToken } | null
// Automatically refreshes tokens if 401 received
```

#### getSessionWithRefresh() (deprecated)

> **Deprecated:** Use `getSession()` instead - it now auto-refreshes tokens on 401.

```ts
// Old way (deprecated)
const session = await getSessionWithRefresh<User>()

// New way (recommended)
const session = await getSession<User>()
```

#### getUser()

```ts
const user = await getUser<User>()
// Returns: User | null
```

#### auth()

```ts
const { user, isAuthenticated } = await auth<User>()
```

#### refreshToken()

Manually refresh tokens on the server side.

```ts
const result = await refreshToken()

if (result.ok) {
  console.log('Tokens refreshed:', result.tokens)
} else {
  console.error('Refresh failed:', result.error)
}
```

### Middleware (`@nightmar3/uauth-next/middleware`)

#### authMiddleware(options)

| Option | Type | Description |
|--------|------|-------------|
| `protectedRoutes` | `string[]` | Routes requiring auth |
| `publicRoutes` | `string[]` | Always public routes |
| `loginUrl` | `string` | Redirect URL for unauth |
| `afterLoginUrl` | `string` | Redirect after login |

Route patterns:
- `/path` - Exact match
- `/path/*` - One level deep
- `/path/**` - All nested paths

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_AUTH_URL` | Yes | Auth API URL (client) |
| `AUTH_URL` | No | Auth API URL (server, defaults to above) |
