import type { User, AuthTokens } from '@uauth/core'

/**
 * Configuration for @uauth/next
 */
export interface UAuthNextConfig {
  /**
   * Base URL for the auth backend
   * Can be set via NEXT_PUBLIC_AUTH_URL env var
   */
  baseURL?: string

  /**
   * Cookie name prefix for storing tokens
   * Default: 'uauth_'
   */
  cookiePrefix?: string

  /**
   * Cookie options
   */
  cookies?: {
    path?: string
    domain?: string
    maxAge?: number
    secure?: boolean
    sameSite?: 'strict' | 'lax' | 'none'
  }

  /**
   * Callback when tokens are refreshed
   */
  onTokenRefresh?: (tokens: AuthTokens) => void

  /**
   * Callback when auth error occurs
   */
  onAuthError?: (error: Error) => void
}

/**
 * Session data returned by getSession
 */
export interface Session<U = User> {
  user: U
  accessToken: string
  expiresAt?: number
}

/**
 * Auth context for server components
 */
export interface ServerAuthContext {
  userId: string | null
  sessionToken: string | null
}

/**
 * Options for route protection middleware
 */
export interface ProtectOptions {
  /**
   * URL to redirect unauthenticated users to
   * Default: '/login'
   */
  loginUrl?: string

  /**
   * URL to redirect authenticated users to (e.g., from login page)
   */
  afterLoginUrl?: string
}

/**
 * Route matcher function type
 */
export type RouteMatcher = (pathname: string) => boolean

/**
 * Middleware config
 */
export interface MiddlewareConfig {
  /**
   * Routes that require authentication
   * Can be an array of paths or a matcher function
   */
  protectedRoutes?: string[] | RouteMatcher

  /**
   * Routes that are always public (skip auth check)
   * Can be an array of paths or a matcher function
   */
  publicRoutes?: string[] | RouteMatcher

  /**
   * URL to redirect unauthenticated users
   * Default: '/login'
   */
  loginUrl?: string

  /**
   * URL to redirect authenticated users from login page
   * Default: '/dashboard'
   */
  afterLoginUrl?: string

  /**
   * Enable debug logging
   */
  debug?: boolean
}
