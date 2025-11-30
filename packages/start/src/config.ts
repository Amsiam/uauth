import type { UAuthStartConfig } from './types'

/**
 * Default configuration
 */
const defaultConfig: Required<Omit<UAuthStartConfig, 'onTokenRefresh' | 'onAuthError'>> = {
  baseURL: '',
  cookiePrefix: 'uauth_',
  cookies: {
    path: '/',
    domain: '',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    secure: import.meta.env.PROD,
    sameSite: 'lax',
  },
}

let globalConfig: UAuthStartConfig = {}

/**
 * Configure @uauth/start globally
 * Call this once in your app (usually in your root route or app entry)
 */
export function configureAuth(config: UAuthStartConfig): void {
  globalConfig = config
}

/**
 * Get the current configuration
 */
export function getConfig(): Required<Omit<UAuthStartConfig, 'onTokenRefresh' | 'onAuthError'>> & Pick<UAuthStartConfig, 'onTokenRefresh' | 'onAuthError'> {
  const baseURL = globalConfig.baseURL ||
    import.meta.env.VITE_AUTH_URL ||
    ''

  if (!baseURL) {
    console.warn(
      '[@uauth/start] No auth URL configured. ' +
      'Set VITE_AUTH_URL environment variable or call configureAuth({ baseURL: "..." })'
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
