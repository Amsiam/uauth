# TanStack Start Auth Demo

This project demonstrates how to integrate `@nightmar3/uauth-tanstack-start` into a TanStack Start application with full OAuth support.

## Prerequisites

1. **Auth Backend**: Ensure the FastAPI backend is running.
   
   > **Note:** The backend must implement the standard Universal Auth contract. See [Backend Requirements](../../packages/tanstack-start/README.md#backend-requirements) for details on required endpoints and response formats.

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
   AUTH_URL=http://localhost:8000
   
   # Secret for encrypting session cookies (min 32 chars)
   SESSION_SECRET=super-secret-dev-key-change-me-to-something-very-long-and-secure
   
   # Optional: OAuth provider credentials
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   ```

3. **Run the Development Server**:

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Production Build

1. **Build the application**:

   ```bash
   npm run build
   ```

2. **Run the production server**:

   ```bash
   # Load environment variables and start
   export $(cat .env | xargs) && npm start
   
   # Or set them inline
   SESSION_SECRET="your-secret" AUTH_URL="http://localhost:8000" npm start
   ```

## Features Demonstrated

### ✅ Password Authentication

- Sign up with email and password
- Sign in with email and password
- Session management with HTTP-only cookies

### ✅ OAuth Authentication

- Google OAuth integration
- GitHub OAuth integration
- Popup-based OAuth flow
- Automatic session creation

### ✅ Protected Routes

- Dashboard route protected with `createAuthBeforeLoad`
- Automatic redirect to login for unauthenticated users
- User context available in protected routes

### ✅ Server Functions

- Protected server functions with `createAuthMiddleware`
- Type-safe user context in server functions
- Automatic token refresh

### ✅ 404 Page

- Custom NotFound component
- User-friendly error page

## Integration Steps

### 1. Configure Root Route (`src/routes/__root.tsx`)

Set up the auth session in your root route to make it available throughout the app.

```tsx
import { getSessionFn } from '@nightmar3/uauth-tanstack-start/server'
import type { User } from '@nightmar3/uauth-core'

interface MyRouterContext {
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
  notFoundComponent: NotFound,
})
```

### 2. Create Login Page (`src/routes/login.tsx`)

Use the `useAuth` and `useOAuth` hooks to handle authentication.

```tsx
import { useAuth, useOAuth } from '@nightmar3/uauth-tanstack-start/client'

function Login() {
  const { signIn, signUp } = useAuth()
  const { providers, signInWithOAuth } = useOAuth()
  
  const handleLogin = async (e) => {
    e.preventDefault()
    const result = await signIn(email, password)
    if (result.ok) {
      window.location.href = '/dashboard'
    }
  }
  
  const handleOAuth = async (provider) => {
    await signInWithOAuth(provider)
    window.location.href = '/dashboard'
  }
  
  // ... render form with OAuth buttons
}
```

### 3. Create OAuth Callback Route (`src/routes/auth/callback.tsx`)

Handle OAuth redirects with a callback route.

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback,
})

function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (window.opener) {
      window.opener.postMessage(
        { type: 'oauth2_callback', code, error },
        window.location.origin
      )
      setTimeout(() => window.close(), 100)
    }
  }, [])

  return <div>Processing authentication...</div>
}
```

### 4. Protect Routes (`src/routes/dashboard.tsx`)

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

### 5. Access User Data

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

### 6. Protect Server Functions

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

## Project Structure

```
src/
├── routes/
│   ├── __root.tsx          # Root route with auth context
│   ├── index.tsx           # Home page
│   ├── login.tsx           # Login/signup page with OAuth
│   ├── dashboard.tsx       # Protected dashboard
│   └── auth/
│       └── callback.tsx    # OAuth callback handler
├── components/
│   └── Header.tsx          # Navigation header
└── styles.css              # Global styles
```

## Troubleshooting

### SESSION_SECRET Error on Production Build

If you see "SESSION_SECRET environment variable is required" when running the production build:

```bash
# Make sure to set the environment variable
export SESSION_SECRET="your-secret-at-least-32-chars"
npm start
```

### OAuth Popup Blocked

If OAuth popups are blocked by the browser:

- Allow popups for `localhost:3000` in your browser settings
- Or use the OAuth redirect flow instead of popup flow

### Hydration Mismatch Warning

If you see hydration warnings in the console, this is likely caused by browser extensions (password managers, etc.) modifying the DOM. This is harmless and doesn't affect functionality.

## Learn More

- [TanStack Start Documentation](https://tanstack.com/start)
- [Universal Auth SDK](https://github.com/Amsiam/uauth)
- [Package README](../../packages/tanstack-start/README.md)
