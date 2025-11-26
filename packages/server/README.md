# universal-auth-sdk-server

Server-side utilities for Universal Auth SDK. Designed for Next.js, Node.js, and other server environments.

## Installation

```bash
npm install universal-auth-sdk universal-auth-sdk-server
```

## Quick Start

### Next.js App Router

```typescript
// app/dashboard/page.tsx
import { cookies } from 'next/headers'
import { createServerAuth, getServerSession } from 'universal-auth-sdk-server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const auth = createServerAuth({
    baseURL: process.env.AUTH_API_URL!
  })

  const session = await getServerSession(auth, cookies)

  if (!session) {
    redirect('/login')
  }

  return (
    <div>
      <h1>Welcome {session.user.name}</h1>
      <p>{session.user.email}</p>
    </div>
  )
}
```

### Next.js Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerAuth } from 'universal-auth-sdk-server'

const auth = createServerAuth({
  baseURL: process.env.AUTH_API_URL!
})

export async function middleware(request: NextRequest) {
  const session = await auth.getSessionFromRequest(request)

  if (!session.ok) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Add user info to headers for downstream use
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', session.data.user.id)
  requestHeaders.set('x-user-email', session.data.user.email)

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  })
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/protected/:path*']
}
```

## API Reference

### `createServerAuth(config)`

Create a server-side auth client.

```typescript
import { createServerAuth } from 'universal-auth-sdk-server'

const auth = createServerAuth({
  baseURL: 'https://api.yourapp.com/auth',
  cookieName: 'auth_token',  // Optional: default 'auth_token'
  fetch: customFetch         // Optional: custom fetch implementation
})
```

### Methods

#### `auth.getSession(cookieHeader)`

Get session from a cookie header string.

```typescript
const session = await auth.getSession(req.headers.cookie)

if (session.ok) {
  console.log('User:', session.data.user)
}
```

**Returns:** `Promise<ApiResponse<SessionData>>`

#### `auth.getSessionFromRequest(request)`

Get session from a Request object (works with Next.js, Vercel Edge, etc.).

```typescript
const session = await auth.getSessionFromRequest(request)

if (session.ok) {
  console.log('User:', session.data.user)
}
```

**Returns:** `Promise<ApiResponse<SessionData>>`

#### `auth.verifyToken(token)`

Verify a JWT token and return user.

```typescript
const token = 'eyJhbGc...'
const result = await auth.verifyToken(token)

if (result.ok) {
  console.log('Token valid:', result.data.user)
}
```

**Returns:** `Promise<ApiResponse<SessionData>>`

### Cookie Utilities

#### `parseCookies(cookieHeader)`

Parse cookies from a Cookie header string.

```typescript
import { parseCookies } from 'universal-auth-sdk-server'

const cookies = parseCookies(req.headers.cookie)
console.log(cookies.auth_token)
```

**Returns:** `Record<string, string>`

#### `serializeCookie(name, value, options)`

Create a cookie string with proper security settings.

```typescript
import { serializeCookie } from 'universal-auth-sdk-server'

const cookie = serializeCookie('auth_token', 'token_value', {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7  // 7 days
})

// Set-Cookie: auth_token=token_value; HttpOnly; Secure; SameSite=Lax; Max-Age=604800
```

**Options:**

```typescript
interface CookieOptions {
  domain?: string
  path?: string
  maxAge?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
}
```

#### `deleteCookie(name, options)`

Create a cookie deletion string.

```typescript
import { deleteCookie } from 'universal-auth-sdk-server'

const cookie = deleteCookie('auth_token')
res.setHeader('Set-Cookie', cookie)
```

### Next.js Utilities

#### `getServerSession(auth, cookies)`

Get session in Next.js App Router server components.

```typescript
import { cookies } from 'next/headers'
import { getServerSession } from 'universal-auth-sdk-server'

const session = await getServerSession(auth, cookies)

if (!session) {
  redirect('/login')
}
```

**Returns:** `Promise<SessionData | null>`

#### `createAuthMiddleware(config)`

Create Next.js middleware with authentication.

```typescript
import { createAuthMiddleware, createServerAuth } from 'universal-auth-sdk-server'

const auth = createServerAuth({
  baseURL: process.env.AUTH_API_URL!
})

const authMiddleware = createAuthMiddleware({
  auth,
  redirectTo: '/login',
  publicPaths: ['/login', '/signup', '/public/*']
})

export async function middleware(request) {
  const result = await authMiddleware(request)

  if (result.redirect) {
    return NextResponse.redirect(new URL(result.redirect, request.url))
  }

  // result.session contains user data
  return NextResponse.next()
}
```

## Examples

### Next.js API Route

```typescript
// app/api/protected/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerAuth } from 'universal-auth-sdk-server'

const auth = createServerAuth({
  baseURL: process.env.AUTH_API_URL!
})

export async function GET(request: NextRequest) {
  const session = await auth.getSessionFromRequest(request)

  if (!session.ok) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return NextResponse.json({
    message: 'Protected data',
    user: session.data.user
  })
}
```

### Express.js Middleware

```typescript
import express from 'express'
import { createServerAuth } from 'universal-auth-sdk-server'

const app = express()
const auth = createServerAuth({
  baseURL: process.env.AUTH_API_URL!
})

// Auth middleware
const requireAuth = async (req, res, next) => {
  const session = await auth.getSession(req.headers.cookie)

  if (!session.ok) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  req.user = session.data.user
  next()
}

// Protected route
app.get('/api/protected', requireAuth, (req, res) => {
  res.json({
    message: 'Protected data',
    user: req.user
  })
})
```

### Cookie-Based Authentication Flow

```typescript
// Sign in endpoint that sets cookie
export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  // Call your auth backend
  const response = await fetch(`${process.env.AUTH_API_URL}/auth/sign-in/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  const result = await response.json()

  if (!result.ok) {
    return NextResponse.json(result, { status: 401 })
  }

  // Set cookie
  const cookie = serializeCookie('auth_token', result.data.tokens.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: result.data.tokens.expires_in
  })

  return NextResponse.json(result, {
    headers: {
      'Set-Cookie': cookie
    }
  })
}
```

### Server Component with User Data

```typescript
// app/profile/page.tsx
import { cookies } from 'next/headers'
import { createServerAuth, getServerSession } from 'universal-auth-sdk-server'
import { redirect } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
}

export default async function ProfilePage() {
  const auth = createServerAuth<User>({
    baseURL: process.env.AUTH_API_URL!
  })

  const session = await getServerSession(auth, cookies)

  if (!session) {
    redirect('/login')
  }

  return (
    <div>
      <h1>{session.user.name}</h1>
      <p>Email: {session.user.email}</p>
      <p>Role: {session.user.role}</p>
    </div>
  )
}
```

### Role-Based Access Control

```typescript
// lib/auth.ts
import { cookies } from 'next/headers'
import { createServerAuth, getServerSession } from 'universal-auth-sdk-server'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const auth = createServerAuth({
    baseURL: process.env.AUTH_API_URL!
  })

  const session = await getServerSession(auth, cookies)

  if (!session) {
    redirect('/login')
  }

  return session
}

export async function requireRole(role: string) {
  const session = await requireAuth()

  if (session.user.role !== role) {
    redirect('/unauthorized')
  }

  return session
}

// Usage in server component
export default async function AdminPage() {
  const session = await requireRole('admin')

  return <AdminPanel user={session.user} />
}
```

## TypeScript Support

Full TypeScript support with generic user types:

```typescript
interface MyUser {
  id: string
  email: string
  role: 'admin' | 'user'
  subscription: string
}

const auth = createServerAuth<MyUser>({
  baseURL: process.env.AUTH_API_URL!
})

const session = await auth.getSession(cookieHeader)

if (session.ok) {
  // session.data.user is typed as MyUser
  console.log(session.data.user.role)
}
```

## Security Best Practices

### Cookie Security

```typescript
serializeCookie('auth_token', token, {
  httpOnly: true,      // Prevents XSS attacks
  secure: true,        // HTTPS only
  sameSite: 'strict',  // CSRF protection
  path: '/',
  maxAge: 60 * 60 * 24 * 7  // 7 days
})
```

### CSRF Protection

For cookie-based auth, implement CSRF tokens:

```typescript
// Generate CSRF token
import { randomBytes } from 'crypto'

const csrfToken = randomBytes(32).toString('hex')

// Store in session and send to client
// Verify on state-changing requests
```

### Token Validation

Always validate tokens on protected routes:

```typescript
const session = await auth.getSessionFromRequest(request)

if (!session.ok) {
  return new Response('Unauthorized', { status: 401 })
}

// Token is valid, proceed
```

## License

MIT
