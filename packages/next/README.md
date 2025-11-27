# @uauth/next

Next.js integration for Universal Auth SDK. Provides seamless authentication with minimal setup.

## Setup Guide

### Step 1: Install the Package

```bash
npm install @uauth/next
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
import { AuthProvider } from '@uauth/next'

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

### Step 4: Create Login Page

```tsx
// app/login/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@uauth/next'

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
import { getSession } from '@uauth/next/server'
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
import { useAuth } from '@uauth/next'

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
import { authMiddleware } from '@uauth/next/middleware'

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

```tsx
'use client'

import { useAuth } from '@uauth/next'

function AuthForm() {
  const { signIn, signUp } = useAuth()

  // Sign in existing user
  const handleSignIn = async (email: string, password: string) => {
    const result = await signIn(email, password)
    if (!result.ok) {
      console.error(result.error?.message)
    }
  }

  // Create new account
  const handleSignUp = async (email: string, password: string, name: string) => {
    const result = await signUp({ email, password, name })
    if (!result.ok) {
      console.error(result.error?.message)
    }
  }
}
```

### OAuth Authentication

```tsx
'use client'

import { useAuth } from '@uauth/next'

function OAuthLogin() {
  const { oauthProviders, oauthLoading, signInWithOAuth } = useAuth()

  if (oauthLoading) return <div>Loading...</div>

  return (
    <div>
      {oauthProviders.map((provider) => (
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

For OAuth, create a callback page:

```tsx
// app/auth/callback/page.tsx
'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@uauth/next'

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
import { getSession, getUser } from '@uauth/next/server'
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
import { SignedIn, SignedOut, AuthGate } from '@uauth/next'

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

---

## API Reference

### Client (`@uauth/next`)

#### AuthProvider

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `loadOnMount` | `boolean` | `true` | Load session on mount |
| `config` | `object` | - | Optional config overrides |

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
| `refreshSession` | `() => Promise` | Refresh session |
| `oauthProviders` | `OAuth2Provider[]` | Available providers |
| `oauthLoading` | `boolean` | Providers loading |
| `signInWithOAuth` | `(provider) => Promise` | OAuth sign in |
| `auth` | `UniversalAuth` | SDK instance |

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

### Server (`@uauth/next/server`)

#### getSession()

```ts
const session = await getSession<User>()
// Returns: { user, accessToken } | null
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

### Middleware (`@uauth/next/middleware`)

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
