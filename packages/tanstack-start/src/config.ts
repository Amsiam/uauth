/**
 * Universal Auth SDK - TanStack Start Configuration
 */

import type { UAuthTanStackConfig } from './types'

let globalConfig: UAuthTanStackConfig | null = null

/**
 * Configure Universal Auth for TanStack Start
 * Call this once in your app, typically in app.config.ts or before rendering
 *
 * @example
 * ```ts
 * import { configureAuth } from '@nightmar3/uauth-tanstack-start'
 *
 * configureAuth({
 *   baseURL: 'https://api.yourapp.com/auth',
 *   sessionSecret: process.env.SESSION_SECRET!,
 * })
 * ```
 */
export function configureAuth(config: UAuthTanStackConfig): void {
  globalConfig = config
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
  return `uauth_${name}`
}

/**
 * Cookie names used by the auth system
 */
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const
