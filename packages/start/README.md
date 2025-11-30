# @nightmar3/uauth-start

TanStack Start integration for Universal Auth SDK. Provides seamless authentication with minimal setup.

## Setup Guide

### Step 1: Install the Package

```bash
npm install @nightmar3/uauth-start
```

### Step 2: Set Environment Variable

Create a `.env` file in your TanStack Start project root:

```env
VITE_AUTH_URL=http://localhost:8000/auth
```

### Step 3: Add AuthProvider to Root Route

Wrap your application with the `AuthProvider`:

```tsx
// app/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AuthProvider } from '@nightmar3/uauth-start'

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  ),
})
```

**With OAuth (optional):** If you need OAuth authentication, pass plugins:

```tsx
import { AuthProvider, createOAuth2Plugin } from '@nightmar3/uauth-start'

const plugins = [createOAuth2Plugin()]

export const Route = createRootRoute({
  component: () => (
    <AuthProvider plugins={plugins}>
      <Outlet />
    </AuthProvider>
  ),
})
```

### Step 4: Create Login Page

```tsx
// app/routes/login.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '@nightmar3/uauth-start'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { user, isLoading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate({ to: '/dashboard' })
    }
  }, [user, navigate])

  if (isLoading || user) {
    return <div>Loading...</div>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await signIn(email, password)
    if (result.ok) {
      navigate({ to: '/dashboard' })
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
// app/routes/dashboard.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession } from '@nightmar3/uauth-start/server'

export const Route = createFileRoute('/dashboard')({
  loader: async ({ context }) => {
    const session = await getSession(context.request)

    if (!session) {
      throw redirect({ to: '/login' })
    }

    return { user: session.user }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = Route.useLoaderData()

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.name || user.email}</p>
    </div>
  )
}
```

### Step 6: Add Sign Out Button

```tsx
// components/sign-out-button.tsx
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@nightmar3/uauth-start'

export function SignOutButton() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate({ to: '/login' })
  }

  return <button onClick={handleSignOut}>Sign Out</button>
}
```

### Step 7 (Optional): Add Route Protection Middleware

```tsx
// app/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AuthProvider } from '@nightmar3/uauth-start'
import { authMiddleware } from '@nightmar3/uauth-start/middleware'

export const Route = createRootRoute({
  beforeLoad: authMiddleware({
    protectedRoutes: ['/dashboard', '/dashboard/**', '/settings/**'],
    loginUrl: '/login',
  }),
  component: () => (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  ),
})
```

That's it! Your TanStack Start app now has full authentication support.

---

## Use Cases

### Email/Password Authentication

#### Sign In

```tsx
import { useAuth } from '@nightmar3/uauth-start'

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
import { useAuth } from '@nightmar3/uauth-start'

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
// app/routes/__root.tsx
import { AuthProvider, createOAuth2Plugin } from '@nightmar3/uauth-start'

const plugins = [createOAuth2Plugin()]

export const Route = createRootRoute({
  component: () => (
    <AuthProvider plugins={plugins}>
      <Outlet />
    </AuthProvider>
  ),
})
```

2. **Use the `useOAuth` hook in your login page:**

```tsx
import { useOAuth } from '@nightmar3/uauth-start'

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
// app/routes/auth/callback.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@nightmar3/uauth-start'

export const Route = createFileRoute('/auth/callback')({
  component: CallbackPage,
})

function CallbackPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const error = Route.useSearch().error

  useEffect(() => {
    if (user) navigate({ to: '/dashboard' })
  }, [user, navigate])

  if (error) {
    return <div>Error: {error}</div>
  }

  return <div>Completing sign in...</div>
}
```

### Server-Side Authentication

```tsx
// app/routes/profile.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSession, getUser } from '@nightmar3/uauth-start/server'

export const Route = createFileRoute('/profile')({
  loader: async ({ context }) => {
    const session = await getSession(context.request)

    if (!session) {
      throw redirect({ to: '/login' })
    }

    return { user: session.user }
  },
  component: ProfilePage,
})

function ProfilePage() {
  const { user } = Route.useLoaderData()

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}
```

### Conditional UI Rendering

```tsx
import { SignedIn, SignedOut, AuthGate } from '@nightmar3/uauth-start'

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
const session = await getSession<MyUser>(request)
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
import { useAuth } from '@nightmar3/uauth-start'

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
// app/routes/api/refresh.ts
import { refreshToken } from '@nightmar3/uauth-start/server'

export async function action({ request }: { request: Request }) {
  const result = await refreshToken(request)

  if (!result.ok) {
    return new Response('Token refresh failed', { status: 401 })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Set-Cookie': result.setCookieHeaders?.join(', ') || '',
    }
  })
}
```

#### Auto-refresh on server

`getSession()` automatically handles token refresh when it receives a 401 (unauthorized) response. If the access token is expired, it will:

1. Attempt to refresh tokens using the refresh token
2. Update the cookies with new tokens
3. Retry the session request with the new access token

This happens transparently - you just use `getSession()`:

```tsx
// app/routes/dashboard.tsx
import { getSession } from '@nightmar3/uauth-start/server'
import { redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
  loader: async ({ context }) => {
    // Automatically refreshes tokens on 401
    const session = await getSession(context.request)

    if (!session) {
      throw redirect({ to: '/login' })
    }

    return { user: session.user }
  }
})
```

---

## API Reference

### Client (`@nightmar3/uauth-start`)

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

### Server (`@nightmar3/uauth-start/server`)

#### getSession()

Get the current session. Automatically refreshes tokens on 401 response.

```ts
const session = await getSession<User>(request)
// Returns: { user, accessToken } | null
// Automatically refreshes tokens if 401 received
```

#### getUser()

```ts
const user = await getUser<User>(request)
// Returns: User | null
```

#### auth()

```ts
const { userId, sessionToken } = await auth(request)
```

#### isAuthenticated()

```ts
const authenticated = await isAuthenticated(request)
// Returns: boolean
```

#### protect()

```ts
const { userId } = await protect(request)
// Throws if not authenticated
```

#### refreshToken()

Manually refresh tokens on the server side.

```ts
const result = await refreshToken(request)

if (result.ok) {
  console.log('Tokens refreshed:', result.tokens)
  console.log('Set-Cookie headers:', result.setCookieHeaders)
} else {
  console.error('Refresh failed:', result.error)
}
```

### Middleware (`@nightmar3/uauth-start/middleware`)

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

#### requireAuth(options)

Protect a specific route.

```tsx
export const Route = createFileRoute('/dashboard')({
  beforeLoad: requireAuth({ loginUrl: '/login' })
})
```

#### redirectIfAuthenticated(options)

Redirect authenticated users away from a route (e.g., login page).

```tsx
export const Route = createFileRoute('/login')({
  beforeLoad: redirectIfAuthenticated({ redirectTo: '/dashboard' })
})
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_AUTH_URL` | Yes | Auth API URL |

---

## Comparison with Next.js Package

The TanStack Start package follows the same architecture as `@nightmar3/uauth-next` but is adapted for:

- **Vite environment variables** (`VITE_AUTH_URL` instead of `NEXT_PUBLIC_AUTH_URL`)
- **TanStack Router** (file-based routing, loaders, beforeLoad)
- **Request-based API** (Web standard Request/Response instead of Next.js cookies API)
- **Server functions** (instead of Next.js Server Components)

All features and APIs are identical - just the underlying framework integration differs.

---

## License

MIT License - see [LICENSE](../../LICENSE) for details
