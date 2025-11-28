# @nightmar3/uauth-core

Core authentication SDK that works with any backend implementing the Universal Auth contract.

## Setup Guide

### Step 1: Install the Package

```bash
npm install @nightmar3/uauth-core
```

### Step 2: Create Auth Instance

```typescript
import { createAuth } from '@nightmar3/uauth-core'

const auth = createAuth({
  baseURL: 'https://api.yourapp.com/auth',
  storage: localStorage,  // or sessionStorage, AsyncStorage, custom
})
```

### Step 3: Sign In

```typescript
const result = await auth.signIn('password', {
  email: 'alice@example.com',
  password: 'secret123',
})

if (result.ok) {
  console.log('User:', result.data.user)
  console.log('Tokens stored automatically')
}
```

### Step 4: Get Session

```typescript
const session = await auth.session()

if (session.ok) {
  console.log('Current user:', session.data.user)
}
```

### Step 5: Sign Out

```typescript
await auth.signOut()
```

That's it! You have full authentication support.

---

## Use Cases

### Email/Password Authentication

```typescript
// Sign in
const result = await auth.signIn('password', {
  email: 'user@example.com',
  password: 'secret',
})

// Sign up
const result = await auth.signUp({
  email: 'newuser@example.com',
  password: 'secure123',
  name: 'New User',
})
```

### OAuth2 Authentication (Optional)

OAuth is completely optional. If you don't need OAuth, skip this section - no extra network requests will be made.

To add OAuth support:

**1. Install the OAuth2 plugin:**

```typescript
import { createAuth, createOAuth2Plugin } from '@nightmar3/uauth-core'

const auth = createAuth({
  baseURL: 'https://api.yourapp.com/auth',
  storage: localStorage,
})

// Install OAuth2 plugin
const oauth2Plugin = createOAuth2Plugin()
await auth.plugin('oauth2', oauth2Plugin)
```

**2. Get available providers:**

```typescript
// Load providers from backend
const providers = await oauth2Plugin.loadProviders()

console.log(providers)
// [{ name: 'google', displayName: 'Google' }, { name: 'github', displayName: 'GitHub' }]
```

**3. Sign in with OAuth:**

```typescript
// Popup flow (recommended for SPAs)
const result = await oauth2Plugin.signInWithPopup({ provider: 'google' })

if (result.ok) {
  console.log('User:', result.data.user)
}

// Redirect flow (for SSR or when popups are blocked)
oauth2Plugin.signInWithRedirect({ provider: 'google' })
```

**4. Handle OAuth callback (for redirect flow):**

```typescript
// On your callback page
const result = await oauth2Plugin.handleCallback()

if (result.ok) {
  console.log('User:', result.data.user)
  window.location.href = '/dashboard'
}
```

### React/Next.js Usage

When using with `@nightmar3/uauth-react` or `@nightmar3/uauth-next`, pass plugins to the AuthProvider:

```tsx
import { createAuth, createOAuth2Plugin } from '@nightmar3/uauth-core'
import { AuthProvider, useOAuth } from '@nightmar3/uauth-react'

const auth = createAuth({ baseURL: '...' })
const plugins = [createOAuth2Plugin()]

function App() {
  return (
    <AuthProvider auth={auth} plugins={plugins}>
      <YourApp />
    </AuthProvider>
  )
}

function LoginPage() {
  const { providers, signInWithOAuth } = useOAuth()

  return (
    <div>
      {providers.map(p => (
        <button key={p.name} onClick={() => signInWithOAuth(p.name)}>
          Continue with {p.displayName}
        </button>
      ))}
    </div>
  )
}
```

### Token Management

```typescript
// Get access token
const token = await auth.getToken()

// Check authentication status
const isAuth = await auth.isAuthenticated()

// Refresh tokens manually
await auth.refresh()
```

### Custom Storage Adapters

```typescript
// React Native with AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage'

const auth = createAuth({
  baseURL: '...',
  storage: AsyncStorage,  // Works directly!
})

// Custom storage
const customStorage = {
  getItem: (key) => myDB.get(key),
  setItem: (key, value) => myDB.set(key, value),
  removeItem: (key) => myDB.delete(key),
}

const auth = createAuth({
  baseURL: '...',
  storage: customStorage,
})
```

---

## API Reference

### createAuth(config)

Create an auth instance.

```typescript
interface AuthConfig {
  baseURL: string                        // Required: Your auth backend URL
  storage?: StorageAdapter               // Optional: Storage implementation
  fetch?: typeof fetch                   // Optional: Custom fetch function
  storageKeyPrefix?: string              // Optional: Prefix for storage keys
  onTokenRefresh?: (tokens) => void      // Optional: Called when tokens refresh
  onAuthError?: (error) => void          // Optional: Called on auth errors
}

const auth = createAuth({
  baseURL: 'https://api.yourapp.com/auth',
  storage: localStorage,
  storageKeyPrefix: 'myapp_',
  onTokenRefresh: (tokens) => {
    console.log('Tokens refreshed')
  },
  onAuthError: (error) => {
    console.error('Auth error:', error.message)
  },
})
```

### auth.signIn(method, payload)

Sign in with various methods.

```typescript
// Password authentication
await auth.signIn('password', {
  email: 'user@example.com',
  password: 'secret',
})

// OAuth2 (with code from callback)
await auth.signIn('oauth2', {
  provider: 'google',
  code: 'auth_code',
})
```

**Returns:** `Promise<ApiResponse<SignInData>>`

### auth.signUp(payload)

Create a new account.

```typescript
const result = await auth.signUp({
  email: 'newuser@example.com',
  password: 'secure123',
  name: 'New User',
})
```

**Returns:** `Promise<ApiResponse<SignInData>>`

### auth.signOut()

Sign out and clear tokens.

```typescript
await auth.signOut()
```

**Returns:** `Promise<ApiResponse<{ ok: boolean }>>`

### auth.session()

Get the current session.

```typescript
const result = await auth.session()

if (result.ok) {
  console.log('User:', result.data.user)
}
```

**Returns:** `Promise<ApiResponse<SessionData>>`

### auth.refresh()

Manually refresh tokens.

```typescript
const result = await auth.refresh()

if (result.ok) {
  console.log('New tokens:', result.data.tokens)
}
```

**Note:** Tokens are automatically refreshed on 401 responses.

### auth.isAuthenticated()

Check if user is authenticated.

```typescript
const isAuth = await auth.isAuthenticated()
```

**Returns:** `Promise<boolean>`

### auth.getToken()

Get the current access token.

```typescript
const token = await auth.getToken()

if (token) {
  fetch('/api/data', {
    headers: { Authorization: `Bearer ${token}` },
  })
}
```

**Returns:** `Promise<string | null>`

### auth.plugin(name, plugin)

Install a plugin.

```typescript
await auth.plugin('oauth2', createOAuth2Plugin())
```

---

## Low-Level Utilities

### refreshTokenRequest(baseURL, refreshToken, fetchFn?)

Low-level utility to make a token refresh request. This is used internally by `auth.refresh()` but is exported for advanced use cases (e.g., server-side refresh).

```typescript
import { refreshTokenRequest } from '@nightmar3/uauth-core'

const result = await refreshTokenRequest(
  'https://api.yourapp.com/auth',
  'refresh_token_value'
)

if (result.ok) {
  console.log('New tokens:', result.data.tokens)
}
```

**Parameters:**
- `baseURL` - The base URL of the auth API
- `refreshToken` - The refresh token to use
- `fetchFn` - Optional custom fetch function (defaults to global `fetch`)

**Returns:** `Promise<ApiResponse<{ tokens: AuthTokens }>>`

---

## OAuth2 Plugin API

### createOAuth2Plugin()

Create the OAuth2 plugin.

```typescript
import { createOAuth2Plugin } from '@nightmar3/uauth-core'

const oauth2Plugin = createOAuth2Plugin()
await auth.plugin('oauth2', oauth2Plugin)
```

### oauth2Plugin.loadProviders()

Load available OAuth providers from backend.

```typescript
const providers = await oauth2Plugin.loadProviders()
// [{ name: 'google', displayName: 'Google' }, ...]
```

**Returns:** `Promise<OAuth2Provider[]>`

### oauth2Plugin.signInWithPopup(options)

Sign in using popup window.

```typescript
const result = await oauth2Plugin.signInWithPopup({
  provider: 'google',
  redirectUri: '/auth/callback',  // Optional
})

if (result.ok) {
  console.log('User:', result.data.user)
}
```

**Returns:** `Promise<ApiResponse<SignInData>>`

### oauth2Plugin.signInWithRedirect(options)

Sign in using redirect.

```typescript
oauth2Plugin.signInWithRedirect({
  provider: 'github',
  redirectUri: '/auth/callback',  // Optional
})
// Page redirects to OAuth provider
```

### oauth2Plugin.handleCallback()

Handle OAuth callback (for redirect flow).

```typescript
// On your callback page
const result = await oauth2Plugin.handleCallback()

if (result.ok) {
  window.location.href = '/dashboard'
}
```

**Returns:** `Promise<ApiResponse<SignInData>>`

---

## Response Format

All methods return a standard response envelope:

```typescript
interface ApiResponse<T> {
  ok: boolean
  data: T | null
  error: ApiError | null
}

interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
}
```

**Success:**

```typescript
{
  ok: true,
  data: {
    user: { id: '...', email: '...', name: '...' },
    tokens: { access_token: '...', refresh_token: '...', expires_in: 3600 }
  },
  error: null
}
```

**Error:**

```typescript
{
  ok: false,
  data: null,
  error: {
    code: 'INVALID_CREDENTIALS',
    message: 'Email or password is incorrect'
  }
}
```

---

## Error Handling

```typescript
const result = await auth.signIn('password', { email, password })

if (!result.ok) {
  switch (result.error?.code) {
    case 'INVALID_CREDENTIALS':
      alert('Wrong email or password')
      break
    case 'NETWORK_ERROR':
      alert('Connection failed')
      break
    default:
      alert(result.error?.message)
  }
}
```

---

## Automatic Token Refresh

The SDK automatically refreshes tokens when:

1. Access token is expired (checked before requests)
2. A request returns 401 Unauthorized

**How it works:**

1. Request fails with 401
2. SDK calls `/token/refresh` with refresh token
3. New tokens stored automatically
4. Original request retried with new token
5. If refresh fails, user is logged out

You don't need to handle this manually.

---

## Storage Adapters

### Built-in Adapters

```typescript
import {
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter,
} from '@nightmar3/uauth-core'

// localStorage (default)
const auth = createAuth({
  baseURL: '...',
  storage: new LocalStorageAdapter(),
})

// sessionStorage (cleared on tab close)
const auth = createAuth({
  baseURL: '...',
  storage: new SessionStorageAdapter(),
})

// In-memory (for testing or SSR)
const auth = createAuth({
  baseURL: '...',
  storage: new MemoryStorageAdapter(),
})
```

### Custom Storage Adapter

```typescript
interface StorageAdapter {
  getItem(key: string): Promise<string | null> | string | null
  setItem(key: string, value: string): Promise<void> | void
  removeItem(key: string): Promise<void> | void
}

// Example: AsyncStorage for React Native
import AsyncStorage from '@react-native-async-storage/async-storage'

const auth = createAuth({
  baseURL: '...',
  storage: AsyncStorage,  // Works directly!
})
```

---

## Plugin System

Extend the SDK with custom plugins.

```typescript
const customPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  install({ client, core, sdk }) {
    // Add methods to SDK
    sdk.customMethod = async () => {
      return client.req('/custom-endpoint')
    }
  },
}

await auth.plugin('my-plugin', customPlugin)

// Now available
await auth.customMethod()
```

---

## TypeScript Support

Full TypeScript support with generic user types:

```typescript
interface MyUser {
  id: string
  email: string
  role: 'admin' | 'user'
  customField: string
}

const auth = createAuth<MyUser>({
  baseURL: '...',
})

const result = await auth.session()

if (result.ok) {
  // result.data.user is typed as MyUser
  console.log(result.data.user.role)
}
```

---

## React Native

Works out of the box with React Native:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAuth } from '@nightmar3/uauth-core'

const auth = createAuth({
  baseURL: 'https://api.yourapp.com/auth',
  storage: AsyncStorage,
})
```

---

## License

MIT
