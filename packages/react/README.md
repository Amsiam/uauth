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

## SSR / Next.js

For server-side rendering, use `universal-auth-sdk-server` package.

See [universal-auth-sdk-server documentation](../server/README.md) for details.

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
