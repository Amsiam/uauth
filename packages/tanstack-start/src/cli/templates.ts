
export const SERVER_TEMPLATE = `/**
 * Universal Auth SDK - TanStack Start Server Functions
 *
 * All server functions that handle authentication operations.
 * These wrap the core package and integrate with TanStack Start's session management.
 */

import { createServerFn } from '@tanstack/react-start'
import { UniversalAuthSDK, type StorageAdapter, type User, createOAuth2Plugin, type OAuth2Provider } from '@nightmar3/uauth-core'
import { useAuthSession } from './session'
import { getConfig } from './config'
import type { Session } from './types'

/**
 * Storage adapter that maps core SDK storage calls to TanStack Start session
 * Implements read-your-writes consistency with a local cache
 */
class TanStackSessionAdapter implements StorageAdapter {
  private cache: Record<string, string> = {}

  constructor(private session: any) {}

  async getItem(key: string): Promise<string | null> {
    // Check cache first
    if (key in this.cache) {
      return this.cache[key] ?? null
    }

    const data = this.session.data
    if (key.endsWith('access_token')) return data.accessToken ?? null
    if (key.endsWith('refresh_token')) return data.refreshToken ?? null
    if (key.endsWith('expires_at')) return data.expiresAt?.toString() ?? null
    return null
  }

  async setItem(key: string, value: string): Promise<void> {
    // Update cache
    this.cache[key] = value

    // We need to get fresh data as multiple setItem calls might happen
    const data = { ...this.session.data }
    
    if (key.endsWith('access_token')) data.accessToken = value
    else if (key.endsWith('refresh_token')) data.refreshToken = value
    else if (key.endsWith('expires_at')) data.expiresAt = parseInt(value, 10)
    
    await this.session.update(data)
  }

  async removeItem(key: string): Promise<void> {
    // Update cache
    delete this.cache[key]

    const data = { ...this.session.data }
    
    if (key.endsWith('access_token')) delete data.accessToken
    else if (key.endsWith('refresh_token')) delete data.refreshToken
    else if (key.endsWith('expires_at')) delete data.expiresAt
    
    await this.session.update(data)
  }
}

/**
 * Helper to create an auth instance scoped to the current request session
 */
export async function getAuth(): Promise<{
  auth: UniversalAuthSDK
  session: Awaited<ReturnType<typeof useAuthSession>>
}> {
  const config = getConfig()
  const session = await useAuthSession()
  
  const auth = new UniversalAuthSDK({
    baseURL: config.baseURL,
    storage: new TanStackSessionAdapter(session),
    // Use global fetch which works in Node 18+ and edge runtimes
    fetch: globalThis.fetch,
  })

  // Only install OAuth2 plugin if explicitly requested
  // This prevents auto-load errors when OAuth isn't configured
  // The plugin will be installed on-demand by OAuth-specific functions

  return { auth, session }
}

/**
 * Sign in with email and password
 */
export const signInFn = createServerFn({ method: 'POST' })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const { auth } = await getAuth()
    return auth.signIn('password', data)
  })

/**
 * Sign up with email and password
 */
export const signUpFn = createServerFn({ method: 'POST' })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const { auth } = await getAuth()
    return auth.signUp(data)
  })

/**
 * Sign out
 */
export const signOutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { auth, session } = await getAuth()
  
  try {
    await auth.signOut()
  } catch (e) {
    console.error('Backend sign out failed:', e)
  }

  // Force clear session data
  await session.update({
    userId: undefined,
    email: undefined,
    accessToken: undefined,
    refreshToken: undefined,
    expiresAt: undefined
  })
})

/**
 * Get current session
 * Auto-refreshes tokens if needed via core SDK
 */
export const getSessionFn = createServerFn({ method: 'GET' }).handler(async (): Promise<Session | null> => {
  const { auth, session } = await getAuth()
  
  // Check if we have tokens locally first to avoid unnecessary network calls
  const accessToken = session.data.accessToken
  if (!accessToken) return null

  // auth.session() will automatically handle token refresh if needed
  const result = await auth.session()

  if (result.ok && result.data?.user) {
    // Get the potentially refreshed token from auth instance
    const freshAccessToken = await auth.getToken()
    
    return {
      user: result.data.user,
      accessToken: freshAccessToken || accessToken,
    }
  }

  return null
})

/**
 * Get current user
 */
export const getUserFn = createServerFn({ method: 'GET' }).handler(async (): Promise<User | null> => {
  const session = await getSessionFn()
  return session?.user ?? null
})

/**
 * Refresh access token manually
 */
export const refreshTokenFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { auth } = await getAuth()
  return auth.refresh()
})

/**
 * Get OAuth providers (proxied via server)
 */
export const getOAuthProvidersFn = createServerFn({ method: 'GET' }).handler(async (): Promise<OAuth2Provider[]> => {
  const { auth } = await getAuth()
  
  // Install OAuth plugin on-demand
  await auth.plugin('oauth2', createOAuth2Plugin())
  
  const plugin = (auth as any).oauth2
  if (!plugin) return []
  
  try {
    return await plugin.loadProviders()
  } catch (error) {
    console.warn('Failed to load OAuth providers:', error)
    return []
  }
})

/**
 * Get OAuth authorization URL (proxied via server)
 */
export const getOAuthUrlFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { provider: string; redirectUri?: string }) => data)
  .handler(async ({ data }) => {
    const { auth } = await getAuth()
    
    // Install OAuth plugin on-demand
    await auth.plugin('oauth2', createOAuth2Plugin())
    
    const plugin = (auth as any).oauth2
    if (!plugin) throw new Error('OAuth plugin not active')
    
    return plugin.getAuthorizationUrl({
      provider: data.provider,
      redirectUri: data.redirectUri,
    })
  })

/**
 * Sign in with OAuth code (proxied via server)
 * Exchanges code for tokens and sets session cookie
 */
export const oauthSignInFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { provider: string; code: string; redirectUri?: string }) => data)
  .handler(async ({ data }) => {
    const { auth } = await getAuth()
    
    // Install OAuth plugin on-demand
    await auth.plugin('oauth2', createOAuth2Plugin())
    
    // This will exchange the code and automatically set tokens via the storage adapter
    return auth.signIn('oauth2', {
      provider: data.provider,
      code: data.code,
      redirect_uri: data.redirectUri,
    })
  })
`

export const CLIENT_TEMPLATE = `/**
 * Universal Auth SDK - TanStack Start Client Hooks
 *
 * Read-only hooks that consume server data from router context
 * All auth state comes from server via loaders - no client-side state manipulation
 */

'use client'

import { useRouter, useRouteContext } from '@tanstack/react-router'
import { 
  useState, 
  useEffect, 
  useCallback,
  type ReactNode
} from 'react'
import type { User, Session } from './types'
import { 
  signInFn, 
  signUpFn, 
  signOutFn, 
  getOAuthProvidersFn,
  getOAuthUrlFn,
  oauthSignInFn
} from './server'
import type { OAuth2Provider } from '@nightmar3/uauth-core'

export interface UseOAuthResult {
  /** Available OAuth providers */
  providers: OAuth2Provider[]
  /** Whether providers are loading */
  isLoading: boolean
  /** Sign in with OAuth provider (popup flow) */
  signInWithOAuth: (provider: string) => Promise<void>
}

/**
 * Hook for OAuth authentication
 * Uses server functions to proxy all auth server requests
 */
export function useOAuth(): UseOAuthResult {
  const [providers, setProviders] = useState<OAuth2Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Load providers from server
  useEffect(() => {
    const load = async () => {
      try {
        const list = await getOAuthProvidersFn()
        setProviders(list)
      } catch (e) {
        console.warn('Failed to load OAuth providers', e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const signInWithOAuth = useCallback(async (provider: string) => {
    // 1. Get Auth URL from server
    const authUrl = await getOAuthUrlFn({ 
      data: { 
        provider,
        // Default redirect to current origin + /auth/callback if not specified
        // The core SDK will handle the callback parsing
        redirectUri: window.location.origin + '/auth/callback'
      } 
    })

    // 2. Open Popup
    const width = 500
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2
    
    const popup = window.open(
      authUrl,
      'OAuth2 Sign In',
      \`width=\${width},height=\${height},left=\${left},top=\${top},toolbar=no,menubar=no,location=no\`
    )

    if (!popup) throw new Error('Popup blocked')

    // 3. Listen for callback message
    return new Promise<void>((resolve, reject) => {
      const handler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        
        const { code, error, error_description } = event.data
        
        // Check if it's an oauth message
        if (!code && !error) return

        window.removeEventListener('message', handler)
        popup.close()

        if (error) {
          reject(new Error(error_description || error))
          return
        }

        try {
          // 4. Exchange code for session via server
          const result = await oauthSignInFn({
            data: {
              provider,
              code,
              redirectUri: window.location.origin + '/auth/callback'
            }
          })

          if (result.ok) {
            router.invalidate()
            resolve()
          } else {
            reject(new Error(result.error?.message || 'OAuth sign in failed'))
          }
        } catch (e) {
          reject(e)
        }
      }

      window.addEventListener('message', handler)
    })
  }, [router])

  return { providers, isLoading, signInWithOAuth }
}

/**
 * Hook to access auth state from router context
 * All data is read-only and comes from server via loaders
 *
 * @example
 * \`\`\`tsx
 * function Profile() {
 *   const { user, isAuthenticated, signOut } = useAuth()
 *
 *   if (!isAuthenticated) {
 *     return <div>Please log in</div>
 *   }
 *
 *   return (
 *     <div>
 *       <p>Hello, {user.name}</p>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   )
 * }
 * \`\`\`
 */
export function useAuth<U extends User = User>() {
  const router = useRouter()
  const context = useRouteContext({ from: '__root__' }) as { user: U | null; isAuthenticated: boolean }

  const user = context.user ?? null
  const isAuthenticated = context.isAuthenticated ?? false

  /**
   * Sign in with email and password
   * Calls server function, then invalidates router to refetch data
   */
  const signIn = async (email: string, password: string, extra?: Record<string, any>) => {
    const result = await signInFn({ data: { email, password, ...extra } })

    if (result.ok) {
      // Invalidate router to refetch user data from server
      router.invalidate()
    }

    return result
  }

  /**
   * Sign up with email and password
   * Calls server function, then invalidates router to refetch data
   */
  const signUp = async (data: any) => {
    const result = await signUpFn({ data })

    if (result.ok) {
      // Invalidate router to refetch user data from server
      router.invalidate()
    }

    return result
  }

  /**
   * Sign out
   * Calls server function, then invalidates router to refetch data
   */
  const signOut = async () => {
    console.log('Starting sign out...')
    try {
      const result = await signOutFn()
      console.log('Sign out server response:', result)
      
      // Use window.location for a clean page refresh
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  return {
    user,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
  }
}

/**
 * Get current user from router context
 * Read-only access to server-provided user data
 *
 * @example
 * \`\`\`tsx
 * function UserBadge() {
 *   const user = useUser()
 *   return <div>{user?.name ?? 'Guest'}</div>
 * }
 * \`\`\`
 */
export function useUser<U extends User = User>(): U | null {
  const { user } = useAuth<U>()
  return user
}

/**
 * Get current session from router context
 * Read-only access to server-provided session data
 *
 * @example
 * \`\`\`tsx
 * function SessionInfo() {
 *   const session = useSession()
 *   return <div>{session ? 'Logged in' : 'Not logged in'}</div>
 * }
 * \`\`\`
 */
export function useSession<U extends User = User>() {
  const { user, isAuthenticated } = useAuth<U>()

  if (!isAuthenticated || !user) {
    return null
  }

  return {
    user,
    isAuthenticated,
  }
}

/**
 * Render children only when authenticated
 * Reads auth state from router context (server-provided)
 *
 * @example
 * \`\`\`tsx
 * <SignedIn>
 *   <UserDashboard />
 * </SignedIn>
 * \`\`\`
 */
export function SignedIn({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : null
}

/**
 * Render children only when NOT authenticated
 * Reads auth state from router context (server-provided)
 *
 * @example
 * \`\`\`tsx
 * <SignedOut>
 *   <LoginPrompt />
 * </SignedOut>
 * \`\`\`
 */
export function SignedOut({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  return !isAuthenticated ? <>{children}</> : null
}

/**
 * Conditional rendering based on auth state
 * Reads from router context (server-provided)
 *
 * @example
 * \`\`\`tsx
 * <AuthGate
 *   fallback={<LoginPrompt />}
 *   loading={<Spinner />}
 * >
 *   <UserDashboard />
 * </AuthGate>
 * \`\`\`
 */
export function AuthGate({
  children,
  fallback,
  loading,
}: {
  children: ReactNode
  fallback?: ReactNode
  loading?: ReactNode
}) {
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  // Show loading state while router is loading
  if (router.state.isLoading && loading) {
    return <>{loading}</>
  }

  if (!isAuthenticated) {
    return <>{fallback ?? null}</>
  }

  return <>{children}</>
}
`

export const SESSION_TEMPLATE = `/**
 * Universal Auth SDK - TanStack Start Session Management
 */

import { useSession } from '@tanstack/react-start/server'
import type { SessionData } from './types'
import { getConfig } from './config'

/**
 * Get or create auth session using TanStack Start's useSession
 * This should be called from server functions only
 *
 * @example
 * \`\`\`ts
 * import { useAuthSession } from './session'
 *
 * export const myServerFn = createServerFn().handler(async () => {
 *   const session = await useAuthSession()
 *   const userId = session.data.userId
 *   // ...
 * })
 * \`\`\`
 */
export function useAuthSession(): ReturnType<typeof useSession<SessionData>> {
  const config = getConfig()

  return useSession<SessionData>({
    name: 'uauth-session',
    password: config.sessionSecret!,
    cookie: {
      secure: config.cookies?.secure ?? true,
      sameSite: (config.cookies?.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
      httpOnly: true,
      path: config.cookies?.path ?? '/',
      maxAge: config.cookies?.maxAge ?? 60 * 60 * 24 * 7, // 7 days
    },
  })
}
`

export const MIDDLEWARE_TEMPLATE = `/**
 * Universal Auth SDK - TanStack Start Middleware
 *
 * Middleware utilities for authentication in TanStack Start
 */

import { createMiddleware } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import type { AuthBeforeLoadOptions } from './types'
import { getSessionFn } from './server'

/**
 * Create auth middleware for server functions
 * Validates that user is authenticated before executing server function
 *
 * @example
 * \`\`\`ts
 * const authMiddleware = createAuthMiddleware()
 *
 * export const protectedFn = createServerFn()
 *   .middleware([authMiddleware])
 *   .handler(async ({ context }) => {
 *     // context.user is guaranteed to exist
 *     return { userId: context.user.id }
 *   })
 * \`\`\`
 */
export function createAuthMiddleware() {
  return createMiddleware({ type: 'function' }).server(async ({ next }) => {
    const session = await getSessionFn()

    if (!session || !session.user) {
      throw new Error('Unauthorized: Authentication required')
    }

    // Add user to context for downstream handlers
    return next({
      context: {
        user: session.user,
        accessToken: session.accessToken,
      },
    })
  })
}

/**
 * Create global auth middleware (optional)
 * Adds auth context to all requests without blocking
 * Use route-level protection for actual auth enforcement
 *
 * @example
 * \`\`\`ts
 * // src/start.ts
 * import { createGlobalAuthMiddleware } from './middleware'
 *
 * export const startInstance = createStart(() => {
 *   return {
 *     requestMiddleware: [createGlobalAuthMiddleware()],
 *   }
 * })
 * \`\`\`
 */
export function createGlobalAuthMiddleware() {
  return createMiddleware().server(async ({ next }) => {
    const session = await getSessionFn()

    // Add auth context without blocking
    return next({
      context: {
        user: session?.user ?? null,
        isAuthenticated: !!session?.user,
      },
    })
  })
}

/**
 * Create beforeLoad helper for route protection
 * Checks authentication and redirects if not authenticated
 *
 * @example
 * \`\`\`ts
 * // routes/dashboard.tsx
 * export const Route = createFileRoute('/dashboard')({
 *   beforeLoad: createAuthBeforeLoad({ redirectTo: '/login' }),
 *   loader: async ({ context }) => {
 *     // context.user is available here
 *     return { data: await fetchUserData(context.user.id) }
 *   },
 * })
 * \`\`\`
 */
export function createAuthBeforeLoad(options: AuthBeforeLoadOptions = {}) {
  const { redirectTo = '/login' } = options

  return async ({ context }: { context: any }) => {
    // Use session from root context to avoid redundant fetches
    const isAuthenticated = context.isAuthenticated ?? false
    const user = context.user ?? null

    if (!isAuthenticated || !user) {
      throw redirect({
        to: redirectTo,
        search: {
          redirect: typeof window !== 'undefined' ? window.location.pathname : undefined,
        },
      })
    }

    // Return user in context for loaders and components
    return {
      user,
      isAuthenticated: true,
    }
  }
}

/**
 * Simple auth requirement for routes
 * Just checks auth and redirects to /login if not authenticated
 *
 * @example
 * \`\`\`ts
 * export const Route = createFileRoute('/protected')({
 *   beforeLoad: requireAuth,
 * })
 * \`\`\`
 */
export const requireAuth = createAuthBeforeLoad()
`

export const TYPES_TEMPLATE = `/**
 * Universal Auth SDK - TanStack Start Integration Types
 */

import type { User, AuthTokens, ApiResponse, ApiError } from '@nightmar3/uauth-core'

/**
 * Configuration for TanStack Start auth integration
 */
export interface UAuthTanStackConfig {
  /**
   * Base URL of your auth backend
   * @example 'https://api.yourapp.com/auth'
   */
  baseURL: string

  /**
   * Session secret for cookie encryption (min 32 characters)
   * @default process.env.SESSION_SECRET
   */
  sessionSecret?: string

  /**
   * Cookie configuration
   */
  cookies?: {
    /** Cookie path @default '/' */
    path?: string
    /** Cookie domain @default undefined */
    domain?: string
    /** Max age in seconds @default 7 days */
    maxAge?: number
    /** Secure flag @default true in production */
    secure?: boolean
    /** SameSite attribute @default 'lax' */
    sameSite?: 'lax' | 'strict' | 'none'
  }
}

/**
 * Session data stored in TanStack Start session
 */
export interface SessionData {
  userId?: string
  email?: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
}

/**
 * Session object returned to client
 */
export interface Session<U extends User = User> {
  user: U
  accessToken: string
}

/**
 * Auth router context interface
 */
export interface AuthRouterContext<U extends User = User> {
  user: U | null
  isAuthenticated: boolean
}

/**
 * Options for beforeLoad auth protection
 */
export interface AuthBeforeLoadOptions {
  /**
   * Path to redirect to if not authenticated
   * @default '/login'
   */
  redirectTo?: string
}

// Re-export core types for convenience
export type { User, AuthTokens, ApiResponse, ApiError }
`

export const CONFIG_TEMPLATE = `/**
 * Universal Auth SDK - TanStack Start Configuration
 */

import type { UAuthTanStackConfig } from './types'

let globalConfig: UAuthTanStackConfig | null = null

/**
 * Configure Universal Auth for TanStack Start
 * Call this once in your app, typically in app.config.ts or before rendering
 *
 * @example
 * \`\`\`ts
 * import { configureAuth } from './config'
 *
 * configureAuth({
 *   baseURL: 'https://api.yourapp.com/auth',
 *   sessionSecret: process.env.SESSION_SECRET!,
 * })
 * \`\`\`
 */
export function configureAuth(config: UAuthTanStackConfig): void {
  globalConfig = config
}

/**
 * Reset configuration (for testing)
 */
export function resetConfig(): void {
  globalConfig = null
}

/**
 * Get the current auth configuration
 * Falls back to environment variables if not configured
 */
export function getConfig(): UAuthTanStackConfig {
  if (globalConfig) {
    return globalConfig
  }

  // Fallback to environment variables
  const baseURL =
    process.env.AUTH_URL ||
    process.env.VITE_AUTH_URL ||
    ''

  const sessionSecret = process.env.SESSION_SECRET || ''

  if (!sessionSecret) {
    throw new Error(
      '[@nightmar3/uauth-tanstack-start] SESSION_SECRET environment variable is required. ' +
      'Set it to a random string of at least 32 characters.'
    )
  }

  return {
    baseURL,
    sessionSecret,
    cookies: {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  }
}

/**
 * Get cookie name with prefix
 */
export function getCookieName(name: string): string {
  return \`uauth_\${name}\`
}

/**
 * Cookie names used by the auth system
 */
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const
`
