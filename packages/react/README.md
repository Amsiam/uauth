# universal-auth-sdk-react

React hooks and components for Universal Auth SDK.

## Installation

```bash
npm install universal-auth-sdk universal-auth-sdk-react
```

## Quick Start

```tsx
import { createAuth } from 'universal-auth-sdk'
import { AuthProvider, useAuth } from 'universal-auth-sdk-react'

// Create auth instance
const auth = createAuth({
  baseURL: 'https://api.yourapp.com/auth'
})

// Wrap your app
function App() {
  return (
    <AuthProvider auth={auth}>
      <YourApp />
    </AuthProvider>
  )
}

// Use in components
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

## API Reference

### Components

#### `<AuthProvider>`

Provides authentication context to your app.

```tsx
<AuthProvider
  auth={authInstance}
  loadOnMount={true}  // Optional: load session on mount (default: true)
>
  {children}
</AuthProvider>
```

**Props:**

- `auth` (required): Auth instance from `createAuth()`
- `loadOnMount` (optional): Whether to load session on mount (default: `true`)
- `children`: React children

#### `<RequireAuth>`

Only renders children if user is authenticated.

```tsx
<RequireAuth
  fallback={<LoginPage />}
  loadingFallback={<LoadingSpinner />}
>
  <ProtectedContent />
</RequireAuth>
```

**Props:**

- `children`: Content to show when authenticated
- `fallback`: Content to show when not authenticated (default: `null`)
- `loadingFallback`: Content to show while checking auth (default: `null`)

**Example:**

```tsx
function App() {
  return (
    <RequireAuth fallback={<LoginPage />}>
      <Dashboard />
    </RequireAuth>
  )
}
```

#### `<GuestOnly>`

Only renders children if user is NOT authenticated.

```tsx
<GuestOnly fallback={<Dashboard />}>
  <LoginPage />
</GuestOnly>
```

**Props:**

- `children`: Content to show when not authenticated
- `fallback`: Content to show when authenticated (default: `null`)
- `loadingFallback`: Content to show while checking auth (default: `null`)

**Example:**

```tsx
function LoginRoute() {
  return (
    <GuestOnly fallback={<Navigate to="/dashboard" />}>
      <LoginPage />
    </GuestOnly>
  )
}
```

#### `<AuthGuard>`

Advanced guard with custom check function.

```tsx
<AuthGuard
  check={(user) => user.role === 'admin'}
  fallback={<AccessDenied />}
>
  <AdminPanel />
</AuthGuard>
```

**Props:**

- `children`: Content or function `(user) => ReactNode`
- `check`: Optional check function `(user) => boolean`
- `fallback`: Content to show when check fails (default: `null`)
- `loadingFallback`: Content to show while loading (default: `null`)

**Examples:**

```tsx
// Role-based access
<AuthGuard check={(user) => user.role === 'admin'}>
  <AdminPanel />
</AuthGuard>

// Render function with user
<AuthGuard>
  {(user) => <div>Hello {user.name}</div>}
</AuthGuard>

// Multiple conditions
<AuthGuard
  check={(user) => user.verified && user.subscription === 'pro'}
  fallback={<UpgradePrompt />}
>
  <PremiumFeature />
</AuthGuard>
```

### Hooks

#### `useAuth()`

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
  refetch           // Reload session
} = useAuth()
```

**Example: Login Form**

```tsx
function LoginForm() {
  const { signIn, isLoading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await signIn('password', { email, password })

    if (result.ok) {
      // Redirect or show success
    }
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
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
      {error && <div className="error">{error.message}</div>}
    </form>
  )
}
```

**Example: Sign Up Form**

```tsx
function SignUpForm() {
  const { signUp, isLoading } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)

    const result = await signUp({
      email: formData.get('email'),
      password: formData.get('password'),
      name: formData.get('name')
    })

    if (result.ok) {
      // User is automatically signed in after signup
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" />
      <input name="email" type="email" placeholder="Email" />
      <input name="password" type="password" placeholder="Password" />
      <button disabled={isLoading}>Sign Up</button>
    </form>
  )
}
```

**Example: User Profile**

```tsx
function UserProfile() {
  const { user, signOut, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>Please log in</div>
  }

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

## TypeScript Support

Full TypeScript support with generic user types:

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

## Patterns

### Protected Routes (React Router)

```tsx
import { Navigate } from 'react-router-dom'
import { RequireAuth } from 'universal-auth-sdk-react'

function ProtectedRoute({ children }) {
  return (
    <RequireAuth fallback={<Navigate to="/login" />}>
      {children}
    </RequireAuth>
  )
}

// Usage
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

### Role-Based Access

```tsx
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
    // Refresh tokens
    await refresh()

    // Reload user data
    await refetch()
  }

  return <button onClick={handleRefresh}>Refresh Session</button>
}
```

## OAuth2 Authentication

The React package includes full OAuth2 support with providers configured from your backend.

### Setup OAuth2

```tsx
import { createAuth, createOAuth2Plugin } from 'universal-auth-sdk'
import { AuthProvider, OAuth2Provider } from 'universal-auth-sdk-react'

const auth = createAuth({ baseURL: 'http://localhost:8000' })

// Install OAuth2 plugin
const oauth2Plugin = createOAuth2Plugin()
auth.plugin('oauth2', oauth2Plugin)

function App() {
  return (
    <AuthProvider auth={auth}>
      <OAuth2Provider auth={auth}>
        <YourApp />
      </OAuth2Provider>
    </AuthProvider>
  )
}
```

### OAuth2 Components

#### `<OAuth2Provider>`

Provides OAuth2 context. Wrap your app with this inside `AuthProvider`.

```tsx
<OAuth2Provider
  auth={authInstance}
  loadOnMount={true}  // Auto-load providers from backend
>
  {children}
</OAuth2Provider>
```

#### `<OAuthButton>`

Renders a sign-in button for a specific OAuth2 provider.

```tsx
<OAuthButton
  provider="google"
  onSuccess={(data) => console.log('Signed in:', data.user)}
  onError={(error) => console.error(error)}
/>

// With custom children
<OAuthButton provider="github">
  <GitHubIcon /> Continue with GitHub
</OAuthButton>

// Use redirect flow instead of popup
<OAuthButton provider="google" useRedirect={true} />
```

**Props:**
- `provider` (required): Provider name (e.g., 'google', 'github')
- `onSuccess`: Callback on successful sign in
- `onError`: Callback on error
- `useRedirect`: Use redirect flow instead of popup (default: `false`)
- `redirectUri`: Custom redirect URI
- `className`: CSS class for styling
- `disabled`: Disable the button
- `children`: Custom button content

#### `<OAuthButtons>`

Renders buttons for all available OAuth2 providers.

```tsx
<OAuthButtons
  onSuccess={(data) => navigate('/dashboard')}
  onError={(error) => setError(error.message)}
/>

// With custom styling
<OAuthButtons
  className="oauth-container"
  buttonClassName="oauth-button"
/>
```

#### `<OAuthCallback>`

Handles OAuth2 callback automatically. Use on your callback page.

```tsx
// pages/auth/callback.tsx
function CallbackPage() {
  return (
    <OAuthCallback
      onSuccess={() => navigate('/dashboard')}
      onError={(error) => navigate('/login?error=' + error.message)}
      loadingComponent={<Spinner />}
      errorComponent={(error) => <div>Error: {error.message}</div>}
    >
      <div>Success! Redirecting...</div>
    </OAuthCallback>
  )
}
```

**Props:**
- `onSuccess`: Callback on successful authentication
- `onError`: Callback on error
- `loadingComponent`: Show while processing (default: "Completing sign in...")
- `errorComponent`: Function to render error state
- `children`: Content to show on success

### `useOAuth2()` Hook

Access OAuth2 state and methods directly.

```tsx
const {
  providers,         // Available OAuth2 providers
  isLoading,         // Loading state
  error,             // Last error
  loadProviders,     // Manually reload providers
  signInWithPopup,   // Sign in with popup
  signInWithRedirect,// Sign in with redirect
  handleCallback,    // Handle OAuth callback
} = useOAuth2()
```

**Example: Custom OAuth UI**

```tsx
function CustomOAuthLogin() {
  const { providers, signInWithPopup, isLoading } = useOAuth2()
  const { refetch } = useAuth()

  const handleOAuth = async (provider: string) => {
    const result = await signInWithPopup({ provider })
    if (result.ok) {
      await refetch() // Refresh user state
      navigate('/dashboard')
    }
  }

  return (
    <div className="oauth-options">
      {providers.map((p) => (
        <button
          key={p.name}
          onClick={() => handleOAuth(p.name)}
          disabled={isLoading}
        >
          Sign in with {p.displayName}
        </button>
      ))}
    </div>
  )
}
```

### Complete OAuth2 Login Page Example

```tsx
import { useState } from 'react'
import { useAuth, useOAuth2, OAuthButtons } from 'universal-auth-sdk-react'

function LoginPage() {
  const { signIn, isLoading: authLoading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    const result = await signIn('password', { email, password })
    if (result.ok) {
      navigate('/dashboard')
    }
  }

  return (
    <div className="login-page">
      <h1>Sign In</h1>

      {/* OAuth2 Buttons */}
      <OAuthButtons
        onSuccess={() => navigate('/dashboard')}
        onError={(err) => alert(err.message)}
      />

      <div className="divider">or</div>

      {/* Password Login */}
      <form onSubmit={handlePasswordLogin}>
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
        <button type="submit" disabled={authLoading}>
          Sign In with Email
        </button>
      </form>

      {error && <div className="error">{error.message}</div>}
    </div>
  )
}
```

## SSR / Next.js

For server-side rendering, use `universal-auth-sdk-server` package.

**Note:** OAuth2 flows (popup/redirect) are client-side only. For Next.js:
- Use `OAuth2Provider` with `loadOnMount={false}` on server
- Load providers client-side with `useEffect`
- OAuth callback handling works normally on client

```tsx
// app/layout.tsx (Next.js App Router)
'use client'

import { AuthProvider, OAuth2Provider } from 'universal-auth-sdk-react'

export default function RootLayout({ children }) {
  return (
    <AuthProvider auth={auth} loadOnMount={false}>
      <OAuth2Provider auth={auth} loadOnMount={false}>
        {children}
      </OAuth2Provider>
    </AuthProvider>
  )
}

// app/login/page.tsx
'use client'

import { useEffect } from 'react'
import { useOAuth2, OAuthButtons } from 'universal-auth-sdk-react'

export default function LoginPage() {
  const { loadProviders } = useOAuth2()

  useEffect(() => {
    loadProviders() // Load providers on client
  }, [])

  return <OAuthButtons />
}
```

See [universal-auth-sdk-server documentation](../server/README.md) for SSR details.

## Examples

### Complete Login/Signup Flow

```tsx
import { useState } from 'react'
import { useAuth } from 'universal-auth-sdk-react'

function AuthPage() {
  const { signIn, signUp, isLoading, error } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const email = formData.get('email')
    const password = formData.get('password')

    if (mode === 'login') {
      await signIn('password', { email, password })
    } else {
      const name = formData.get('name')
      await signUp({ email, password, name })
    }
  }

  return (
    <div>
      <h1>{mode === 'login' ? 'Sign In' : 'Sign Up'}</h1>

      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <input name="name" placeholder="Name" required />
        )}
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required />

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
        </button>
      </form>

      {error && <div className="error">{error.message}</div>}

      <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? 'Need an account?' : 'Already have an account?'}
      </button>
    </div>
  )
}
```

## License

MIT
