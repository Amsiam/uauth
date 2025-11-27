# @uauth/core

Core authentication SDK that works with any backend implementing the Universal Auth contract.

## Installation

```bash
npm install @uauth/core
```

## Quick Start

```typescript
import { createAuth } from '@uauth/core'

const auth = createAuth({
  baseURL: 'https://api.yourapp.com/auth',
  storage: localStorage  // or sessionStorage, AsyncStorage, custom
})

// Sign in
const result = await auth.signIn('password', {
  email: 'alice@example.com',
  password: 'secret123'
})

if (result.ok) {
  console.log('User:', result.data.user)
  console.log('Tokens stored automatically')
}

// Get current session
const session = await auth.session()
if (session.ok) {
  console.log('Current user:', session.data.user)
}

// Sign out
await auth.signOut()
```

## Configuration

### createAuth(config)

```typescript
interface AuthConfig {
  baseURL: string                        // Required: Your auth backend URL
  storage?: StorageAdapter               // Optional: Storage implementation
  fetch?: typeof fetch                   // Optional: Custom fetch function
  storageKeyPrefix?: string              // Optional: Prefix for storage keys
  onTokenRefresh?: (tokens) => void      // Optional: Called when tokens refresh
  onAuthError?: (error) => void          // Optional: Called on auth errors
}
```

**Example with all options:**

```typescript
const auth = createAuth({
  baseURL: 'https://api.yourapp.com/auth',
  storage: localStorage,
  storageKeyPrefix: 'myapp_',
  onTokenRefresh: (tokens) => {
    console.log('Tokens refreshed:', tokens.expires_in)
  },
  onAuthError: (error) => {
    console.error('Auth error:', error.message)
    // Redirect to login, show notification, etc.
  }
})
```

## API Reference

### Authentication Methods

#### `signIn(method, payload)`

Sign in with various authentication methods.

```typescript
// Password authentication
await auth.signIn('password', {
  email: 'user@example.com',
  password: 'secret'
})

// OAuth2 (if backend supports)
await auth.signIn('oauth2', {
  provider: 'google',
  code: 'auth_code'
})

// Magic link (if backend supports)
await auth.signIn('magic-link', {
  email: 'user@example.com'
})
```

**Returns:** `Promise<ApiResponse<SignInData>>`

```typescript
{
  ok: true,
  data: {
    user: { id: '...', email: '...', name: '...' },
    tokens: {
      access_token: '...',
      refresh_token: '...',
      expires_in: 3600
    }
  },
  error: null
}
```

#### `signUp(payload)`

Create a new user account.

```typescript
const result = await auth.signUp({
  email: 'newuser@example.com',
  password: 'secure123',
  name: 'New User'
})
```

**Returns:** Same as `signIn()`

#### `signOut()`

Sign out the current user and clear all tokens.

```typescript
await auth.signOut()
```

**Returns:** `Promise<ApiResponse<{ ok: boolean }>>`

### Session Management

#### `session()`

Get the current user session.

```typescript
const result = await auth.session()

if (result.ok) {
  console.log('User:', result.data.user)
}
```

**Returns:** `Promise<ApiResponse<SessionData>>`

#### `refresh()`

Manually refresh the access token.

```typescript
const result = await auth.refresh()

if (result.ok) {
  console.log('New tokens:', result.data.tokens)
}
```

**Note:** Tokens are automatically refreshed on 401 responses. You rarely need to call this manually.

### Utilities

#### `isAuthenticated()`

Check if user is authenticated.

```typescript
const isAuth = await auth.isAuthenticated()

if (isAuth) {
  console.log('User is logged in')
}
```

**Returns:** `Promise<boolean>`

#### `getToken()`

Get the current access token.

```typescript
const token = await auth.getToken()

if (token) {
  // Use token for manual API calls
  fetch('/api/data', {
    headers: { Authorization: `Bearer ${token}` }
  })
}
```

**Returns:** `Promise<string | null>`

### Low-Level API

#### `auth.api.req(path, body?, options?)`

Make a raw API request.

```typescript
// Custom endpoint
const result = await auth.api.req('/custom-endpoint', {
  some: 'data'
})

// GET request
const result = await auth.api.req('/custom-endpoint', null, {
  method: 'GET'
})

// Skip authentication
const result = await auth.api.req('/public-endpoint', null, {
  skipAuth: true
})
```

## Storage Adapters

### Built-in Adapters

```typescript
import {
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter
} from '@uauth/core'

// localStorage (default)
const auth = createAuth({
  baseURL: '...',
  storage: new LocalStorageAdapter()
})

// sessionStorage (cleared on tab close)
const auth = createAuth({
  baseURL: '...',
  storage: new SessionStorageAdapter()
})

// In-memory (for testing or SSR)
const auth = createAuth({
  baseURL: '...',
  storage: new MemoryStorageAdapter()
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
  storage: AsyncStorage  // Works directly!
})
```

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

You don't need to handle this manually!

## Plugin System

Extend the SDK with custom functionality.

```typescript
const customPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  install({ client, core, sdk }) {
    // Add methods to SDK
    sdk.customMethod = async () => {
      return client.req('/custom-endpoint')
    }
  }
}

auth.plugin('my-plugin', customPlugin)

// Now available
await auth.customMethod()
```

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
  baseURL: '...'
})

const result = await auth.session()
if (result.ok) {
  // result.data.user is typed as MyUser
  console.log(result.data.user.role)
}
```

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

**Success response:**

```typescript
{
  ok: true,
  data: { /* your data */ },
  error: null
}
```

**Error response:**

```typescript
{
  ok: false,
  data: null,
  error: {
    code: 'INVALID_CREDENTIALS',
    message: 'Email or password is incorrect',
    details: {}
  }
}
```

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

## React Native

Works out of the box with React Native:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAuth } from '@uauth/core'

const auth = createAuth({
  baseURL: 'https://api.yourapp.com/auth',
  storage: AsyncStorage
})
```

## License

MIT
