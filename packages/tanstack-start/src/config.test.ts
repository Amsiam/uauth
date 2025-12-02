import { describe, it, expect, beforeEach, vi } from 'vitest'
import { configureAuth, getConfig, getCookieName, resetConfig } from './config'

describe('config', () => {
  beforeEach(() => {
    // Reset process.env
    vi.stubEnv('SESSION_SECRET', 'test-secret-key-must-be-at-least-32-chars-long')
    vi.stubEnv('AUTH_URL', 'http://localhost:8000')
    vi.stubEnv('VITE_AUTH_URL', '')
    
    // Reset global config
    resetConfig()
    
    // Set default config for most tests
    configureAuth({
      baseURL: 'http://localhost:8000',
      sessionSecret: 'test-secret',
    })
  })

  describe('getConfig', () => {
    it('should return configured values', () => {
      configureAuth({
        baseURL: 'https://api.example.com',
        sessionSecret: 'custom-secret',
      })

      const config = getConfig()
      expect(config.baseURL).toBe('https://api.example.com')
      expect(config.sessionSecret).toBe('custom-secret')
    })

    it('should throw if session secret is missing', () => {
      vi.stubEnv('SESSION_SECRET', '')
      resetConfig()
      
      expect(() => getConfig()).toThrow('SESSION_SECRET environment variable is required')
    })

    it('should use environment variables if config is not set', () => {
      resetConfig()
      vi.stubEnv('AUTH_URL', '') // Clear AUTH_URL to test fallback
      vi.stubEnv('SESSION_SECRET', 'env-secret-key-must-be-long-enough')
      vi.stubEnv('VITE_AUTH_URL', 'https://env-api.example.com')

      const config = getConfig()
      expect(config.baseURL).toBe('https://env-api.example.com')
      expect(config.sessionSecret).toBe('env-secret-key-must-be-long-enough')
    })

    it('should prioritize AUTH_URL over VITE_AUTH_URL', () => {
      resetConfig()
      vi.stubEnv('SESSION_SECRET', 'secret')
      vi.stubEnv('AUTH_URL', 'https://auth-url.com')
      vi.stubEnv('VITE_AUTH_URL', 'https://vite-url.com')

      const config = getConfig()
      expect(config.baseURL).toBe('https://auth-url.com')
    })

    it('should use default cookie options', () => {
      resetConfig()
      vi.stubEnv('SESSION_SECRET', 'secret')
      
      const config = getConfig()
      expect(config.cookies).toEqual({
        path: '/',
        maxAge: 604800,
        secure: false, // NODE_ENV is not production in test
        sameSite: 'lax',
      })
    })
  })

  describe('getCookieName', () => {
    it('should prefix cookie names', () => {
      expect(getCookieName('test')).toBe('uauth_test')
    })
  })
})
