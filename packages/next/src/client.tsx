'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import {
  createAuth,
  createOAuth2Plugin,
  CookieStorageAdapter,
  type UniversalAuth,
  type User,
  type OAuth2Provider,
  type SignUpPayload,
  type PasswordSignInPayload,
} from '@uauth/core'
import { getConfig, getCookieName, COOKIE_NAMES } from './config'
import type { UAuthNextConfig, Session } from './types'

// ============================================================================
// Auth Instance Management
// ============================================================================

let authInstance: UniversalAuth | null = null
let oauth2Plugin: ReturnType<typeof createOAuth2Plugin> | null = null

/**
 * Get or create the auth instance (lazy initialization for SSR safety)
 */
function getAuthInstance(): UniversalAuth | null {
  if (typeof window === 'undefined') return null

  if (!authInstance) {
    const config = getConfig()

    if (!config.baseURL) {
      console.error('[@uauth/next] Auth URL not configured')
      return null
    }

    authInstance = createAuth({
      baseURL: config.baseURL,
      storage: new CookieStorageAdapter({
        path: config.cookies.path,
        domain: config.cookies.domain || undefined,
        maxAge: config.cookies.maxAge,
        secure: config.cookies.secure,
        sameSite: config.cookies.sameSite,
      }),
      storageKeyPrefix: config.cookiePrefix,
      onTokenRefresh: config.onTokenRefresh,
      onAuthError: config.onAuthError ? (err) => config.onAuthError!(new Error(err.message)) : undefined,
    })

    // Auto-install OAuth2 plugin
    oauth2Plugin = createOAuth2Plugin()
    authInstance.plugin('oauth2', oauth2Plugin)
  }

  return authInstance
}

/**
 * Get the OAuth2 plugin instance
 */
function getOAuth2Plugin() {
  // Ensure auth instance is created first
  getAuthInstance()
  return oauth2Plugin
}

// ============================================================================
// Context
// ============================================================================

interface AuthState<U = User> {
  user: U | null
  isLoading: boolean
  isAuthenticated: boolean
  error: Error | null
}

interface AuthContextValue<U = User> extends AuthState<U> {
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: Error }>
  signUp: (data: { email: string; password: string; name?: string }) => Promise<{ ok: boolean; error?: Error }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>

  // OAuth methods
  oauthProviders: OAuth2Provider[]
  oauthLoading: boolean
  signInWithOAuth: (provider: string) => Promise<void>

  // Low-level access
  auth: UniversalAuth | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ============================================================================
// Provider Component
// ============================================================================

export interface AuthProviderProps {
  children: ReactNode
  /**
   * Optional config overrides
   */
  config?: UAuthNextConfig
  /**
   * Load session on mount
   * Default: true
   */
  loadOnMount?: boolean
}

/**
 * Auth provider component - wrap your app with this
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { AuthProvider } from '@uauth/next/client'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <AuthProvider>{children}</AuthProvider>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function AuthProvider({
  children,
  config,
  loadOnMount = true,
}: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: loadOnMount,
    isAuthenticated: false,
    error: null,
  })

  const [oauthProviders, setOauthProviders] = useState<OAuth2Provider[]>([])
  const [oauthLoading, setOauthLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Initialize on mount
  useEffect(() => {
    setMounted(true)

    if (!loadOnMount) {
      setState((s) => ({ ...s, isLoading: false }))
      return
    }

    const init = async () => {
      const auth = getAuthInstance()
      if (!auth) {
        setState((s) => ({ ...s, isLoading: false }))
        return
      }

      try {
        // Load session
        const sessionResult = await auth.session()
        if (sessionResult.ok && sessionResult.data) {
          setState({
            user: sessionResult.data.user,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          })
        } else {
          setState((s) => ({ ...s, isLoading: false }))
        }

        // Load OAuth providers (non-blocking)
        const plugin = getOAuth2Plugin()
        if (plugin) {
          setOauthLoading(true)
          try {
            const providers = await plugin.loadProviders()
            setOauthProviders(providers)
          } catch {
            // OAuth not configured - that's ok
          } finally {
            setOauthLoading(false)
          }
        }
      } catch (err) {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: err instanceof Error ? err : new Error('Failed to load session'),
        })
      }
    }

    init()
  }, [loadOnMount])

  // Auth methods
  const signIn = useCallback(async (email: string, password: string) => {
    const auth = getAuthInstance()
    if (!auth) return { ok: false, error: new Error('Auth not initialized') }

    setState((s) => ({ ...s, isLoading: true, error: null }))

    try {
      const result = await auth.signIn('password', { email, password })

      if (result.ok && result.data) {
        setState({
          user: result.data.user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        })
        return { ok: true }
      } else {
        const error = new Error(result.error?.message || 'Sign in failed')
        setState((s) => ({ ...s, isLoading: false, error }))
        return { ok: false, error }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign in failed')
      setState((s) => ({ ...s, isLoading: false, error }))
      return { ok: false, error }
    }
  }, [])

  const signUp = useCallback(async (data: { email: string; password: string; name?: string }) => {
    const auth = getAuthInstance()
    if (!auth) return { ok: false, error: new Error('Auth not initialized') }

    setState((s) => ({ ...s, isLoading: true, error: null }))

    try {
      const result = await auth.signUp(data)

      if (result.ok && result.data) {
        setState({
          user: result.data.user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        })
        return { ok: true }
      } else {
        const error = new Error(result.error?.message || 'Sign up failed')
        setState((s) => ({ ...s, isLoading: false, error }))
        return { ok: false, error }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign up failed')
      setState((s) => ({ ...s, isLoading: false, error }))
      return { ok: false, error }
    }
  }, [])

  const signOut = useCallback(async () => {
    const auth = getAuthInstance()
    if (!auth) return

    try {
      await auth.signOut()
    } finally {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      })
    }
  }, [])

  const refreshSession = useCallback(async () => {
    const auth = getAuthInstance()
    if (!auth) return

    setState((s) => ({ ...s, isLoading: true }))

    try {
      const result = await auth.session()
      if (result.ok && result.data) {
        setState({
          user: result.data.user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        })
      } else {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        })
      }
    } catch (err) {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: err instanceof Error ? err : new Error('Failed to refresh session'),
      })
    }
  }, [])

  const signInWithOAuth = useCallback(async (provider: string) => {
    const plugin = getOAuth2Plugin()
    if (!plugin) {
      throw new Error('OAuth2 not initialized')
    }

    // Use popup flow
    const result = await plugin.signInWithPopup({ provider })

    if (result.ok && result.data) {
      setState({
        user: result.data.user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      })
    } else {
      throw new Error(result.error?.message || 'OAuth sign in failed')
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    signIn,
    signUp,
    signOut,
    refreshSession,
    oauthProviders,
    oauthLoading,
    signInWithOAuth,
    auth: getAuthInstance(),
  }), [state, signIn, signUp, signOut, refreshSession, oauthProviders, oauthLoading, signInWithOAuth])

  // Don't render provider until mounted (SSR safety)
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================================================
// Hooks
// ============================================================================

// Default context value for SSR
const defaultContextValue: AuthContextValue = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  signIn: async () => ({ ok: false, error: new Error('Auth not initialized') }),
  signUp: async () => ({ ok: false, error: new Error('Auth not initialized') }),
  signOut: async () => {},
  refreshSession: async () => {},
  oauthProviders: [],
  oauthLoading: false,
  signInWithOAuth: async () => { throw new Error('Auth not initialized') },
  auth: null,
}

/**
 * Get the current auth state and methods
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useAuth } from '@uauth/next/client'
 *
 * export function Profile() {
 *   const { user, isLoading, signOut } = useAuth()
 *
 *   if (isLoading) return <div>Loading...</div>
 *   if (!user) return <div>Not signed in</div>
 *
 *   return (
 *     <div>
 *       <p>Hello, {user.name}</p>
 *       <button onClick={signOut}>Sign out</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAuth<U = User>(): AuthContextValue<U> {
  const context = useContext(AuthContext)

  // Return default context during SSR/SSG to avoid throwing errors
  if (!context) {
    return defaultContextValue as AuthContextValue<U>
  }

  return context as AuthContextValue<U>
}

/**
 * Get just the current user (null if not authenticated)
 */
export function useUser<U = User>(): U | null {
  const { user } = useAuth<U>()
  return user
}

/**
 * Get the current session (user + tokens)
 */
export function useSession<U = User>(): Session<U> | null {
  const { user, isAuthenticated } = useAuth<U>()
  const auth = getAuthInstance()

  if (!isAuthenticated || !user || !auth) return null

  // Get token synchronously from cookie
  const cookieName = getCookieName(COOKIE_NAMES.ACCESS_TOKEN)
  const accessToken = typeof document !== 'undefined'
    ? document.cookie
        .split(';')
        .find((c) => c.trim().startsWith(`${cookieName}=`))
        ?.split('=')[1] || ''
    : ''

  return {
    user,
    accessToken,
  }
}

// ============================================================================
// Utility Components
// ============================================================================

/**
 * Render children only when authenticated
 */
export function SignedIn({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading || !isAuthenticated) return null
  return <>{children}</>
}

/**
 * Render children only when NOT authenticated
 */
export function SignedOut({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading || isAuthenticated) return null
  return <>{children}</>
}

/**
 * Render different content based on auth state
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
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <>{loading || null}</>
  if (!isAuthenticated) return <>{fallback || null}</>
  return <>{children}</>
}

// ============================================================================
// Re-exports from @uauth/react for convenience
// ============================================================================

export {
  OAuthButton,
  OAuthButtons,
  type OAuthButtonProps,
  type OAuthButtonsProps,
  type OAuthButtonRenderProps,
} from '@uauth/react'
