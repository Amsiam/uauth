'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import {
  createAuth,
  CookieStorageAdapter,
  type UniversalAuth,
  type User,
  type Plugin,
  type OAuth2Provider,
  OAuth2Plugin,
} from '@uauth/core'
import { getConfig, getCookieName, COOKIE_NAMES } from './config'
import type { UAuthNextConfig, Session } from './types'

// ============================================================================
// Auth Instance Management
// ============================================================================

let authInstance: UniversalAuth | null = null
let installedPlugins: Map<string, Plugin> = new Map()

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
  }

  return authInstance
}

/**
 * Install plugins on the auth instance
 */
async function installPlugins(plugins: Plugin[]): Promise<void> {
  const auth = getAuthInstance()
  if (!auth) return

  for (const plugin of plugins) {
    if (!installedPlugins.has(plugin.name)) {
      await auth.plugin(plugin.name, plugin)
      installedPlugins.set(plugin.name, plugin)
    }
  }
}

/**
 * Get an installed plugin by name
 */
function getPlugin<T extends Plugin>(name: string): T | null {
  return (installedPlugins.get(name) as T) || null
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

  // Low-level access
  auth: UniversalAuth | null
  getPlugin: <T extends Plugin>(name: string) => T | null
  pluginsReady: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ============================================================================
// Provider Component
// ============================================================================

export interface AuthProviderProps {
  children: ReactNode
  /**
   * Plugins to install (e.g., OAuth2, MagicLink)
   * @example
   * ```tsx
   * import { createOAuth2Plugin } from '@uauth/core'
   *
   * <AuthProvider plugins={[createOAuth2Plugin()]}>
   * ```
   */
  plugins?: Plugin[]
  /**
   * Load session on mount
   * Default: true
   */
  loadOnMount?: boolean
  /**
   * Enable automatic token refresh before expiry
   * When enabled, tokens will be refreshed automatically before they expire
   * @default true
   */
  autoRefresh?: boolean
  /**
   * How many seconds before expiry to refresh the token
   * @default 60 (1 minute before expiry)
   */
  refreshBeforeExpiry?: number
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
  plugins = [],
  loadOnMount = true,
  autoRefresh = true,
  refreshBeforeExpiry = 60,
}: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: loadOnMount,
    isAuthenticated: false,
    error: null,
  })

  const [mounted, setMounted] = useState(false)
  const [pluginsReady, setPluginsReady] = useState(plugins.length === 0)
  const pluginsInstalled = useRef(false)
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear any existing refresh timeout
  const clearRefreshTimeout = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }
  }, [])

  // Schedule auto-refresh based on token expiry time
  const scheduleAutoRefresh = useCallback(async () => {
    if (!autoRefresh) return

    const auth = getAuthInstance()
    if (!auth) return

    clearRefreshTimeout()

    try {
      const expiresAt = await auth.api.getTokenExpiresAt()
      if (!expiresAt) return

      const now = Date.now()
      const refreshAt = expiresAt - (refreshBeforeExpiry * 1000)
      const delay = refreshAt - now

      // Only schedule if token expires in the future
      if (delay > 0) {
        refreshTimeoutRef.current = setTimeout(async () => {
          try {
            const result = await auth.refresh()
            if (result.ok) {
              // Schedule next refresh after successful refresh
              scheduleAutoRefresh()
            }
          } catch {
            // Refresh failed, will be handled on next request
          }
        }, delay)
      } else if (delay > -refreshBeforeExpiry * 1000) {
        // Token is about to expire or just expired, refresh immediately
        try {
          const result = await auth.refresh()
          if (result.ok) {
            scheduleAutoRefresh()
          }
        } catch {
          // Refresh failed
        }
      }
    } catch {
      // Failed to get expiry time
    }
  }, [autoRefresh, refreshBeforeExpiry, clearRefreshTimeout])

  // Initialize on mount
  useEffect(() => {
    setMounted(true)

    const init = async () => {
      const auth = getAuthInstance()
      if (!auth) {
        setState((s) => ({ ...s, isLoading: false }))
        setPluginsReady(true)
        return
      }

      // Install plugins once
      if (!pluginsInstalled.current && plugins.length > 0) {
        await installPlugins(plugins)
        pluginsInstalled.current = true
        setPluginsReady(true)
      }

      if (!loadOnMount) {
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
          // Schedule auto-refresh when session is loaded
          scheduleAutoRefresh()
        } else {
          setState((s) => ({ ...s, isLoading: false }))
          clearRefreshTimeout()
        }
      } catch (err) {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: err instanceof Error ? err : new Error('Failed to load session'),
        })
        clearRefreshTimeout()
      }
    }

    init()

    // Cleanup on unmount
    return () => {
      clearRefreshTimeout()
    }
  }, [loadOnMount, plugins, scheduleAutoRefresh, clearRefreshTimeout])

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
        // Schedule auto-refresh after successful sign-in
        scheduleAutoRefresh()
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
  }, [scheduleAutoRefresh])

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
        // Schedule auto-refresh after successful sign-up
        scheduleAutoRefresh()
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
  }, [scheduleAutoRefresh])

  const signOut = useCallback(async () => {
    const auth = getAuthInstance()
    if (!auth) return

    try {
      await auth.signOut()
    } finally {
      // Clear auto-refresh on sign out
      clearRefreshTimeout()
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      })
    }
  }, [clearRefreshTimeout])

  /**
   * Refresh the access token and reload user session
   * This calls the /token/refresh endpoint to get new tokens
   */
  const refreshSession = useCallback(async () => {
    const auth = getAuthInstance()
    if (!auth) return

    setState((s) => ({ ...s, isLoading: true }))

    try {
      // First, refresh the tokens
      const refreshResult = await auth.refresh()

      if (!refreshResult.ok) {
        // Token refresh failed - user needs to re-authenticate
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: new Error(refreshResult.error?.message || 'Token refresh failed'),
        })
        return
      }

      // Then reload the session with new tokens
      const sessionResult = await auth.session()
      if (sessionResult.ok && sessionResult.data) {
        setState({
          user: sessionResult.data.user,
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

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    signIn,
    signUp,
    signOut,
    refreshSession,
    auth: getAuthInstance(),
    getPlugin,
    pluginsReady,
  }), [state, signIn, signUp, signOut, refreshSession, pluginsReady])

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
  auth: null,
  getPlugin: () => null,
  pluginsReady: false,
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
// OAuth Hook (optional - only works when OAuth2 plugin is installed)
// ============================================================================

interface UseOAuthResult {
  providers: OAuth2Provider[]
  isLoading: boolean
  signInWithOAuth: (provider: string) => Promise<void>
}

/**
 * Hook for OAuth authentication
 * Only works when OAuth2 plugin is installed via AuthProvider's plugins prop
 *
 * @example
 * ```tsx
 * // First, install the plugin in your provider
 * <AuthProvider plugins={[createOAuth2Plugin()]}>
 *
 * // Then use the hook
 * const { providers, signInWithOAuth } = useOAuth()
 * ```
 */
export function useOAuth(): UseOAuthResult {
  const { getPlugin, pluginsReady } = useAuth()
  const [providers, setProviders] = useState<OAuth2Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Wait for plugins to be installed
    if (!pluginsReady) return

    const loadProviders = async () => {
      const plugin = getPlugin<OAuth2Plugin>('oauth2')
      if (plugin) {
        try {
          const loadedProviders = await plugin.loadProviders()
          setProviders(loadedProviders)
        } catch {
          // OAuth not configured on backend
        }
      }
      setIsLoading(false)
    }

    loadProviders()
  }, [getPlugin, pluginsReady])

  const signInWithOAuth = useCallback(async (provider: string) => {
    const plugin = getPlugin<OAuth2Plugin>('oauth2')
    if (!plugin) {
      throw new Error('OAuth2 plugin not installed. Add createOAuth2Plugin() to AuthProvider plugins.')
    }

    const result = await plugin.signInWithPopup({ provider })
    if (!result.ok) {
      throw new Error(result.error?.message || 'OAuth sign in failed')
    }
  }, [getPlugin])

  return { providers, isLoading, signInWithOAuth }
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
// Re-exports for convenience
// ============================================================================

export { createOAuth2Plugin, type Plugin } from '@uauth/core'
