# @nightmar3/uauth-tanstack-start

> **TanStack Start integration for Universal Auth SDK**  
> Zero-config authentication with full SSR support

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## Features

- ✅ **Zero-config setup** - Works with environment variables
- ✅ **Full SSR support** - Server-first authentication
- ✅ **Security-first** - Read-only client hooks, server-only validation
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Middleware** - Route protection with `beforeLoad`
- ✅ **Tiny** - Minimal bundle size
- ✅ **Framework-native** - Uses TanStack Start patterns

## Installation

```bash
npm install @nightmar3/uauth-tanstack-start
```

## Quick Start

### 1. Set Environment Variables

```bash
# .env
AUTH_URL=https://api.yourapp.com/auth
SESSION_SECRET=your-secret-key-min-32-characters
```

### 2. Set Up Root Route

```tsx
// routes/__root.tsx
import { createRootRoute } from '@tanstack/react-router'
import { getSessionFn } from '@nightmar3/uauth-tanstack-start/server'

export const Route = createRootRoute({
  loader: async () => {
    const session = await getSessionFn()
    return {
      user: session?.user ?? null,
      isAuthenticated: !!session?.user,
    }
  },
})
```

### 3. Use in Components

```tsx
// components/Profile.tsx
'use client'

import { useAuth } from '@nightmar3/uauth-tanstack-start/client'

export function Profile() {
  const { user, isAuthenticated, signOut } = useAuth()

  if (!isAuthenticated) {
    return <div>Please log in</div>
  }

  return (
    <div>
      <p>Hello, {user.name}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

### 4. Protect Routes

```tsx
// routes/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router'
import { createAuthBeforeLoad } from '@nightmar3/uauth-tanstack-start/middleware'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: createAuthBeforeLoad({ redirectTo: '/login' }),
  component: DashboardPage,
})
```

## API Reference

### Server Functions

#### `getSessionFn()`
Get current session (auto-refreshes tokens if expired)

```tsx
const session = await getSessionFn()
// Returns: { user, accessToken } | null
```

#### `signInFn({ data })`
Sign in with email and password

```tsx
const result = await signInFn({ 
  data: { email: 'user@example.com', password: 'password' } 
})
```

#### `signUpFn({ data })`
Create new user account

```tsx
const result = await signUpFn({ 
  data: { email: 'user@example.com', password: 'password', name: 'John' } 
})
```

#### `signOutFn()`
Sign out and clear session

```tsx
await signOutFn()
```

### Client Hooks

#### `useAuth()`
Access auth state and methods

```tsx
const { user, isAuthenticated, signIn, signUp, signOut } = useAuth()
```

**Note:** All data is read-only from server. Auth methods call server functions and trigger router invalidation.

#### `useUser()`
Get current user

```tsx
const user = useUser()
```

#### `useSession()`
Get full session

```tsx
const session = useSession()
```

### Components

#### `<SignedIn>`
Render children only when authenticated

```tsx
<SignedIn>
  <UserDashboard />
</SignedIn>
```

#### `<SignedOut>`
Render children only when NOT authenticated

```tsx
<SignedOut>
  <LoginPrompt />
</SignedOut>
```

#### `<AuthGate>`
Conditional rendering with fallback

```tsx
<AuthGate fallback={<LoginPrompt />} loading={<Spinner />}>
  <UserDashboard />
</AuthGate>
```

### Middleware

#### `createAuthBeforeLoad(options)`
Route protection helper

```tsx
export const Route = createFileRoute('/protected')({
  beforeLoad: createAuthBeforeLoad({ redirectTo: '/login' }),
})
```

#### `requireAuth`
Simple auth requirement

```tsx
export const Route = createFileRoute('/protected')({
  beforeLoad: requireAuth,
})
```

#### `createAuthMiddleware()`
Server function middleware

```tsx
const authMiddleware = createAuthMiddleware()

export const protectedFn = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    // context.user is guaranteed to exist
    return { userId: context.user.id }
  })
```

## Security Architecture

### Server-First Design

- ✅ All auth data comes from server via loaders
- ✅ Client hooks are read-only consumers
- ✅ No client-side auth state manipulation
- ✅ Server validates every operation
- ✅ HTTP-only cookies prevent XSS

### How It Works

```
User Action (e.g., Sign In)
  ↓
useAuth().signIn() (client)
  ↓
signInFn() (server function)
  ↓
Server validates credentials
  ↓
Server updates session (HTTP-only cookies)
  ↓
Router invalidates
  ↓
Root loader re-runs
  ↓
Fresh user data from server
  ↓
UI updates
```

## Configuration

### Environment Variables (Recommended)

```bash
AUTH_URL=https://api.yourapp.com/auth
SESSION_SECRET=your-secret-key-min-32-characters
```

### Programmatic Configuration

```tsx
import { configureAuth } from '@nightmar3/uauth-tanstack-start'

configureAuth({
  baseURL: 'https://api.yourapp.com/auth',
  sessionSecret: process.env.SESSION_SECRET!,
  cookies: {
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
})
```

## Examples

### Login Page

```tsx
'use client'

import { useAuth } from '@nightmar3/uauth-tanstack-start/client'
import { useState } from 'react'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await signIn(email, password)
    
    if (!result.ok) {
      alert(result.error?.message)
    }
    // Router will auto-redirect after successful login
  }

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
      />
      <input 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
      />
      <button type="submit">Sign In</button>
    </form>
  )
}
```

### Protected Route with Data

```tsx
// routes/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router'
import { createAuthBeforeLoad } from '@nightmar3/uauth-tanstack-start/middleware'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: createAuthBeforeLoad({ redirectTo: '/login' }),
  loader: async ({ context }) => {
    // context.user is available from beforeLoad
    const data = await fetchUserData(context.user.id)
    return { data }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { data } = Route.useLoaderData()
  const { user } = useAuth()
  
  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
```

## Migration from Next.js

If you're migrating from `@nightmar3/uauth-next`:

1. Replace package:
   ```bash
   npm uninstall @nightmar3/uauth-next
   npm install @nightmar3/uauth-tanstack-start
   ```

2. Update imports:
   ```tsx
   // Before
   import { useAuth } from '@nightmar3/uauth-next/client'
   
   // After
   import { useAuth } from '@nightmar3/uauth-tanstack-start/client'
   ```

3. Replace middleware with `beforeLoad`:
   ```tsx
   // Before (Next.js middleware)
   export default authMiddleware({ protectedRoutes: ['/dashboard'] })
   
   // After (TanStack Start beforeLoad)
   export const Route = createFileRoute('/dashboard')({
     beforeLoad: requireAuth,
   })
   ```

## License

MIT © nightmar3

## Links

- [Universal Auth SDK](https://github.com/Amsiam/uauth)
- [TanStack Start](https://tanstack.com/start)
- [Documentation](https://github.com/Amsiam/uauth/tree/main/packages/tanstack-start)
