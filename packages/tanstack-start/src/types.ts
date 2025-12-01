/**
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
