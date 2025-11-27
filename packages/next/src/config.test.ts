import { describe, it, expect, beforeEach, vi } from 'vitest'
import { configureAuth, getConfig, getCookieName, COOKIE_NAMES } from './config'

describe('config', () => {
  beforeEach(() => {
    // Reset config between tests
    configureAuth({})
    // Clear env vars
    vi.unstubAllEnvs()
  })

  describe('getConfig', () => {
    it('should return default config when nothing is set', () => {
      const config = getConfig()

      expect(config.cookiePrefix).toBe('uauth_')
      expect(config.cookies.path).toBe('/')
      expect(config.cookies.sameSite).toBe('lax')
      expect(config.cookies.maxAge).toBe(7 * 24 * 60 * 60)
    })

    it('should use NEXT_PUBLIC_AUTH_URL env var', () => {
      vi.stubEnv('NEXT_PUBLIC_AUTH_URL', 'https://api.example.com/auth')

      const config = getConfig()

      expect(config.baseURL).toBe('https://api.example.com/auth')
    })

    it('should prefer configured baseURL over env var', () => {
      vi.stubEnv('NEXT_PUBLIC_AUTH_URL', 'https://api.example.com/auth')
      configureAuth({ baseURL: 'https://custom.example.com/auth' })

      const config = getConfig()

      expect(config.baseURL).toBe('https://custom.example.com/auth')
    })

    it('should merge cookie options', () => {
      configureAuth({
        cookies: {
          sameSite: 'strict',
          secure: true,
        },
      })

      const config = getConfig()

      expect(config.cookies.sameSite).toBe('strict')
      expect(config.cookies.secure).toBe(true)
      expect(config.cookies.path).toBe('/') // Default preserved
    })
  })

  describe('getCookieName', () => {
    it('should prefix cookie names with default prefix', () => {
      expect(getCookieName('access_token')).toBe('uauth_access_token')
      expect(getCookieName('refresh_token')).toBe('uauth_refresh_token')
    })

    it('should use custom prefix when configured', () => {
      configureAuth({ cookiePrefix: 'myapp_auth_' })

      expect(getCookieName('access_token')).toBe('myapp_auth_access_token')
    })
  })

  describe('COOKIE_NAMES', () => {
    it('should have standard cookie name constants', () => {
      expect(COOKIE_NAMES.ACCESS_TOKEN).toBe('access_token')
      expect(COOKIE_NAMES.REFRESH_TOKEN).toBe('refresh_token')
      expect(COOKIE_NAMES.TOKEN_EXPIRY).toBe('token_expiry')
    })
  })
})
