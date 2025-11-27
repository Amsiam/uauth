import type { UAuthNextConfig } from './types'

/**
 * Default configuration
 */
const defaultConfig: Required<Omit<UAuthNextConfig, 'onTokenRefresh' | 'onAuthError'>> = {
  baseURL: '',
  cookiePrefix: 'uauth_',
  cookies: {
    path: '/',
    domain: '',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
}

let globalConfig: UAuthNextConfig = {}

/**
 * Configure @uauth/next globally
 * Call this once in your app (usually in layout.tsx or _app.tsx)
 */
export function configureAuth(config: UAuthNextConfig): void {
  globalConfig = config
}

/**
 * Get the current configuration
 */
export function getConfig(): Required<Omit<UAuthNextConfig, 'onTokenRefresh' | 'onAuthError'>> & Pick<UAuthNextConfig, 'onTokenRefresh' | 'onAuthError'> {
  const baseURL = globalConfig.baseURL ||
    process.env.NEXT_PUBLIC_AUTH_URL ||
    (typeof window !== 'undefined' ? '' : '')

  if (!baseURL) {
    console.warn(
      '[@uauth/next] No auth URL configured. ' +
      'Set NEXT_PUBLIC_AUTH_URL environment variable or call configureAuth({ baseURL: "..." })'
    )
  }

  return {
    ...defaultConfig,
    ...globalConfig,
    baseURL,
    cookies: {
      ...defaultConfig.cookies,
      ...globalConfig.cookies,
    },
  }
}

/**
 * Get the cookie name for a given key
 */
export function getCookieName(key: string): string {
  const config = getConfig()
  return `${config.cookiePrefix}${key}`
}

/**
 * Standard cookie names used by the SDK
 */
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_EXPIRY: 'token_expiry',
} as const
