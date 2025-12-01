# TanStack Start Auth Demo

This project demonstrates how to integrate `@nightmar3/uauth-tanstack-start` into a TanStack Start application.

## Prerequisites

1. **Auth Backend**: Ensure the FastAPI backend is running.
   ```bash
   cd ../../backends/fastapi
   # Follow backend README instructions to start the server
   ```

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env` file in the root of this demo project:
   ```env
   # URL of your running Auth Backend
   VITE_AUTH_URL=http://localhost:8000
   
   # Secret for encrypting session cookies (min 32 chars)
   SESSION_SECRET=super-secret-dev-key-change-me-to-something-very-long-and-secure
   ```

3. **Run the Development Server**:
   ```bash
   npm run dev
   ```

## Integration Steps

### 1. Configure Root Route (`src/routes/__root.tsx`)

Set up the auth session in your root route to make it available throughout the app.

```tsx
import { getSessionFn } from '@nightmar3/uauth-tanstack-start/server'
import type { User } from '@nightmar3/uauth-core'

interface MyRouterContext {
  // ... other context
  session: Awaited<ReturnType<typeof getSessionFn>>
  user: User | null
  isAuthenticated: boolean
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async () => {
    const session = await getSessionFn()
    return { 
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session?.user
    }
  },
  // ...
})
```

### 2. Create Login Page (`src/routes/login.tsx`)

Use the `useAuth` hook to handle sign-in and sign-up.

```tsx
import { useAuth } from '@nightmar3/uauth-tanstack-start/client'

function Login() {
  const { signIn, signUp } = useAuth()
  
  const handleLogin = async (e) => {
    e.preventDefault()
    const result = await signIn(email, password)
    if (result.ok) {
      window.location.href = '/dashboard'
    } else {
      console.error(result.error)
    }
  }
  
  // ... render form
}
```

### 3. Protect Routes (`src/routes/dashboard.tsx`)

Use `createAuthBeforeLoad` to protect routes that require authentication.

```tsx
import { createAuthBeforeLoad } from '@nightmar3/uauth-tanstack-start/middleware'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: createAuthBeforeLoad({
    redirectTo: '/login',
  }),
  component: Dashboard,
})
```

### 4. Access User Data

Use the `useUser` hook in your components to access the current user.

```tsx
import { useUser } from '@nightmar3/uauth-tanstack-start/client'

function Dashboard() {
  const user = useUser()
  
  return (
    <div>
      <h1>Welcome, {user?.email}</h1>
    </div>
  )
}
```

### 5. Protect Server Functions

Use `createAuthMiddleware` to protect server-side functions.

```tsx
import { createAuthMiddleware } from '@nightmar3/uauth-tanstack-start/middleware'
import { createServerFn } from '@tanstack/react-start'

const getSecretData = createServerFn({ method: 'GET' })
  .middleware([createAuthMiddleware()])
  .handler(async ({ context }) => {
    // context.user is guaranteed to exist here
    return {
      message: `Hello ${context.user.email}!`
    }
  })
```

## Features

- **Server-Side Session Management**: HttpOnly cookies managed securely.
- **Type-Safe Context**: Full TypeScript support for user and session data.
- **Protected Routes**: Easy middleware for route protection.
- **Server Function Middleware**: Secure your API endpoints.
- **OAuth Support**: Built-in support for OAuth providers (Google, GitHub, etc.).
