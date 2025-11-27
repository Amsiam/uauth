# @uauth/react

React hooks and components for Universal Auth SDK.

## Setup Guide

### Step 1: Install Packages

```bash
npm install @uauth/core @uauth/react
```

### Step 2: Create Auth Instance

```tsx
// lib/auth.ts
import { createAuth } from '@uauth/core'

export const auth = createAuth({
  baseURL: 'https://api.yourapp.com/auth',
  storage: localStorage,
})
```

### Step 3: Wrap Your App with AuthProvider

```tsx
// App.tsx
import { AuthProvider } from '@uauth/react'
import { auth } from './lib/auth'

function App() {
  return (
    <AuthProvider auth={auth}>
      <YourApp />
    </AuthProvider>
  )
}
```

### Step 4: Create Login Form

```tsx
import { useState } from 'react'
import { useAuth } from '@uauth/react'

function LoginForm() {
  const { signIn, isLoading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await signIn('password', { email, password })

    if (result.ok) {
      // Redirect or show success
      console.log('Logged in:', result.data?.user)
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
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
      {error && <div className="error">{error.message}</div>}
    </form>
  )
}
```

### Step 5: Create Protected Content

```tsx
import { RequireAuth, useAuth } from '@uauth/react'

function Dashboard() {
  const { user, signOut } = useAuth()

  return (
    <div>
      <h1>Welcome {user?.name}</h1>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}

function App() {
  return (
    <RequireAuth fallback={<LoginForm />}>
      <Dashboard />
    </RequireAuth>
  )
}
```

That's it! Your React app now has full authentication support.

---

## Use Cases

### Email/Password Authentication

```tsx
const { signIn, signUp, isLoading, error } = useAuth()

// Sign in
const result = await signIn('password', { email, password })

// Sign up
const result = await signUp({ email, password, name })
```

### OAuth Authentication (Optional)

OAuth is completely optional. If you don't need OAuth, skip this section - no extra network requests will be made.

To add OAuth support:

**1. Add the OAuth2 plugin to AuthProvider:**

```tsx
import { createAuth, createOAuth2Plugin } from '@uauth/core'
import { AuthProvider } from '@uauth/react'

const auth = createAuth({
  baseURL: 'https://api.yourapp.com/auth',
  storage: localStorage,
})

// Only include if you want OAuth
const plugins = [createOAuth2Plugin()]

function App() {
  return (
    <AuthProvider auth={auth} plugins={plugins}>
      <YourApp />
    </AuthProvider>
  )
}
```

**2. Use the `useOAuth` hook:**

```tsx
import { useOAuth } from '@uauth/react'

function OAuthButtons() {
  const { providers, isLoading, signInWithOAuth } = useOAuth()

  // No OAuth configured - render nothing
  if (providers.length === 0) return null

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      {providers.map((provider) => (
        <button
          key={provider.name}
          onClick={() => signInWithOAuth(provider.name)}
        >
          Continue with {provider.displayName || provider.name}
        </button>
      ))}
    </div>
  )
}
```

**3. Complete login page with OAuth:**

```tsx
import { useState } from 'react'
import { useAuth, useOAuth } from '@uauth/react'

function LoginPage() {
  const { signIn, isLoading, error } = useAuth()
  const { providers, signInWithOAuth, isLoading: oauthLoading } = useOAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await signIn('password', { email, password })
  }

  return (
    <div>
      {/* OAuth Buttons (only shows if providers available) */}
      {providers.length > 0 && (
        <>
          <div className="oauth-buttons">
            {providers.map((p) => (
              <button
                key={p.name}
                onClick={() => signInWithOAuth(p.name)}
                disabled={oauthLoading}
              >
                Continue with {p.displayName}
              </button>
            ))}
          </div>
          <div className="divider">or</div>
        </>
      )}

      {/* Email/Password Form */}
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
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {error && <div className="error">{error.message}</div>}
    </div>
  )
}
```

### Protected Routes (React Router)

```tsx
import { Navigate } from 'react-router-dom'
import { RequireAuth } from '@uauth/react'

function ProtectedRoute({ children }) {
  return (
    <RequireAuth fallback={<Navigate to="/login" />}>
      {children}
    </RequireAuth>
  )
}

// Usage in routes
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

### Role-Based Access Control

```tsx
import { AuthGuard } from '@uauth/react'

function AdminRoute({ children }) {
  return (
    <AuthGuard
      check={(user) => user.role === 'admin'}
      fallback={<Navigate to="/" />}
    >
      {children}
    </AuthGuard>
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

// Type the hook
const { user } = useAuth<MyUser>()

// user is typed as MyUser | null
if (user) {
  console.log(user.role) // 'admin' | 'user'
}

// Type the AuthGuard
<AuthGuard<MyUser> check={(user) => user.role === 'admin'}>
  <AdminPanel />
</AuthGuard>
```

---

## API Reference

### AuthProvider

Provides authentication context to your app.

```tsx
<AuthProvider
  auth={authInstance}
  plugins={[]}              // Optional: plugins like OAuth2
  loadOnMount={true}        // Optional: load session on mount (default: true)
  autoRefresh={true}        // Optional: auto-refresh tokens before expiry (default: true)
  refreshBeforeExpiry={60}  // Optional: seconds before expiry to refresh (default: 60)
>
  {children}
</AuthProvider>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `auth` | `UniversalAuth` | Required | Auth instance from `createAuth()` |
| `plugins` | `Plugin[]` | `[]` | Plugins to install (e.g., OAuth2) |
| `loadOnMount` | `boolean` | `true` | Load session on mount |
| `autoRefresh` | `boolean` | `true` | Auto-refresh tokens before expiry |
| `refreshBeforeExpiry` | `number` | `60` | Seconds before expiry to refresh |

### useAuth()

Main hook for accessing auth state and methods.

```tsx
const {
  user,             // Current user or null
  isLoading,        // Loading state
  isAuthenticated,  // True if user is logged in
  error,            // Last error or null
  signIn,           // Sign in function
  signUp,           // Sign up function
  signOut,          // Sign out function
  refresh,          // Refresh tokens
  refetch,          // Reload session
  setUser,          // Manually set user
  getPlugin,        // Get installed plugin by name
  pluginsReady,     // Whether plugins are installed
  auth,             // The auth instance
} = useAuth()
```

### useOAuth() (requires OAuth2 plugin)

Hook for OAuth authentication. Only works when `createOAuth2Plugin()` is passed to AuthProvider.

```tsx
const {
  providers,         // Available OAuth providers
  isLoading,         // Loading state
  signInWithOAuth,   // Sign in with OAuth provider
} = useOAuth()
```

| Property | Type | Description |
|----------|------|-------------|
| `providers` | `OAuth2Provider[]` | Available providers from backend |
| `isLoading` | `boolean` | Whether providers are loading |
| `signInWithOAuth` | `(provider: string) => Promise<void>` | Trigger OAuth flow |

### RequireAuth

Only renders children if user is authenticated.

```tsx
<RequireAuth
  fallback={<LoginPage />}
  loadingFallback={<Spinner />}
>
  <ProtectedContent />
</RequireAuth>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Required | Content to show when authenticated |
| `fallback` | `ReactNode` | `null` | Content to show when not authenticated |
| `loadingFallback` | `ReactNode` | `null` | Content to show while loading |

### GuestOnly

Only renders children if user is NOT authenticated.

```tsx
<GuestOnly fallback={<Navigate to="/dashboard" />}>
  <LoginPage />
</GuestOnly>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | Required | Content to show when not authenticated |
| `fallback` | `ReactNode` | `null` | Content to show when authenticated |
| `loadingFallback` | `ReactNode` | `null` | Content to show while loading |

### AuthGuard

Advanced guard with custom check function.

```tsx
<AuthGuard
  check={(user) => user.role === 'admin'}
  fallback={<AccessDenied />}
>
  <AdminPanel />
</AuthGuard>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode \| (user) => ReactNode` | Required | Content or render function |
| `check` | `(user) => boolean` | - | Custom validation function |
| `fallback` | `ReactNode` | `null` | Content when check fails |
| `loadingFallback` | `ReactNode` | `null` | Content while loading |

---

## Patterns

### Auto Token Refresh

By default, tokens are automatically refreshed before they expire. This happens silently in the background - no user interaction required.

```tsx
// Default: auto-refresh enabled, refreshes 60 seconds before expiry
<AuthProvider auth={auth}>
  <App />
</AuthProvider>

// Customize when to refresh (e.g., 5 minutes before expiry)
<AuthProvider auth={auth} refreshBeforeExpiry={300}>
  <App />
</AuthProvider>

// Disable auto-refresh (not recommended)
<AuthProvider auth={auth} autoRefresh={false}>
  <App />
</AuthProvider>
```

**How it works:**
1. When user signs in or session loads, a timer is set based on token expiry
2. Token is refreshed automatically before it expires
3. On sign out, the timer is cleared
4. If refresh fails, the next API request will trigger a 401 → automatic refresh retry

### Loading States

```tsx
function App() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return <FullPageSpinner />
  }

  return <YourApp />
}
```

### Error Handling

```tsx
function LoginForm() {
  const { signIn, error } = useAuth()
  const [localError, setLocalError] = useState(null)

  const handleSubmit = async (data) => {
    setLocalError(null)
    const result = await signIn('password', data)

    if (!result.ok) {
      setLocalError(result.error?.message || 'Login failed')
    }
  }

  return (
    <>
      {localError && <Alert>{localError}</Alert>}
      {error && <Alert>{error.message}</Alert>}
      <form onSubmit={handleSubmit}>...</form>
    </>
  )
}
```

### Manual Session Refresh

```tsx
function RefreshButton() {
  const { refresh, refetch } = useAuth()

  const handleRefresh = async () => {
    await refresh()  // Refresh tokens
    await refetch()  // Reload user data
  }

  return <button onClick={handleRefresh}>Refresh Session</button>
}
```

### Conditionally Enable OAuth

```tsx
// Only enable OAuth in certain environments
const plugins = process.env.REACT_APP_ENABLE_OAUTH === 'true'
  ? [createOAuth2Plugin()]
  : []

function App() {
  return (
    <AuthProvider auth={auth} plugins={plugins}>
      <YourApp />
    </AuthProvider>
  )
}
```

---

## Legacy OAuth2 API

The previous `OAuth2Provider` and `useOAuth2` APIs are still available for backwards compatibility, but we recommend using the new plugin-based approach with `useOAuth()`.

```tsx
// Legacy (still works)
import { OAuth2Provider, useOAuth2 } from '@uauth/react'

// New approach (recommended)
import { AuthProvider, useOAuth } from '@uauth/react'
import { createOAuth2Plugin } from '@uauth/core'
```

---

## License

MIT
