import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UniversalAuthSDK } from './auth'
import { MemoryStorageAdapter } from './storage'
import type { Plugin } from './types'

describe('UniversalAuthSDK', () => {
  let auth: UniversalAuthSDK
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()

    auth = new UniversalAuthSDK({
      baseURL: 'https://api.example.com/auth',
      storage: new MemoryStorageAdapter(),
      fetch: mockFetch as any,
    })
  })

  describe('Sign In', () => {
    it('should sign in with password successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            user: {
              id: 'user_123',
              email: 'test@example.com',
              name: 'Test User',
            },
            tokens: {
              access_token: 'access_token_123',
              refresh_token: 'refresh_token_456',
              expires_in: 3600,
            },
          },
          error: null,
        }),
      })

      const result = await auth.signIn('password', {
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result.ok).toBe(true)
      expect(result.data?.user.email).toBe('test@example.com')
      expect(result.data?.tokens.access_token).toBe('access_token_123')

      // Verify fetch was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/sign-in/password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        })
      )

      // Verify tokens were stored
      const token = await auth.getToken()
      expect(token).toBe('access_token_123')
    })

    it('should handle sign in failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: false,
          data: null,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        }),
      })

      const result = await auth.signIn('password', {
        email: 'test@example.com',
        password: 'wrong_password',
      })

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('INVALID_CREDENTIALS')

      // Verify tokens were not stored
      const token = await auth.getToken()
      expect(token).toBeNull()
    })

    it('should support OAuth2 sign in', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            user: { id: 'user_123', email: 'test@example.com' },
            tokens: {
              access_token: 'token_123',
              refresh_token: 'refresh_123',
              expires_in: 3600,
            },
          },
          error: null,
        }),
      })

      const result = await auth.signIn('oauth2', {
        provider: 'google',
        code: 'auth_code_123',
      })

      expect(result.ok).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/sign-in/oauth2',
        expect.anything()
      )
    })

    it('should support magic link sign in', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            user: { id: 'user_123', email: 'test@example.com' },
            tokens: {
              access_token: 'token_123',
              refresh_token: 'refresh_123',
              expires_in: 3600,
            },
          },
          error: null,
        }),
      })

      const result = await auth.signIn('magic-link', {
        email: 'test@example.com',
      })

      expect(result.ok).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/sign-in/magic-link',
        expect.anything()
      )
    })
  })

  describe('Sign Up', () => {
    it('should sign up successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            user: {
              id: 'user_123',
              email: 'newuser@example.com',
              name: 'New User',
            },
            tokens: {
              access_token: 'access_token_123',
              refresh_token: 'refresh_token_456',
              expires_in: 3600,
            },
          },
          error: null,
        }),
      })

      const result = await auth.signUp({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      })

      expect(result.ok).toBe(true)
      expect(result.data?.user.email).toBe('newuser@example.com')

      // Verify tokens were stored
      const token = await auth.getToken()
      expect(token).toBe('access_token_123')
    })

    it('should handle sign up failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: false,
          data: null,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Email already registered',
          },
        }),
      })

      const result = await auth.signUp({
        email: 'existing@example.com',
        password: 'password123',
      })

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('EMAIL_EXISTS')
    })
  })

  describe('Sign Out', () => {
    it('should sign out successfully', async () => {
      // First sign in
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            user: { id: 'user_123', email: 'test@example.com' },
            tokens: {
              access_token: 'token_123',
              refresh_token: 'refresh_123',
              expires_in: 3600,
            },
          },
          error: null,
        }),
      })

      await auth.signIn('password', {
        email: 'test@example.com',
        password: 'password123',
      })

      // Then sign out
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: { ok: true },
          error: null,
        }),
      })

      const result = await auth.signOut()

      expect(result.ok).toBe(true)

      // Verify tokens were cleared
      const token = await auth.getToken()
      expect(token).toBeNull()
    })

    it('should clear tokens even on failure', async () => {
      // First sign in
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            user: { id: 'user_123', email: 'test@example.com' },
            tokens: {
              access_token: 'token_123',
              refresh_token: 'refresh_123',
              expires_in: 3600,
            },
          },
          error: null,
        }),
      })

      await auth.signIn('password', {
        email: 'test@example.com',
        password: 'password123',
      })

      // Sign out fails on server
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: false,
          data: null,
          error: { code: 'ERROR', message: 'Server error' },
        }),
      })

      await auth.signOut()

      // Tokens should still be cleared
      const token = await auth.getToken()
      expect(token).toBeNull()
    })
  })

  describe('Session', () => {
    it('should get current session', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            user: {
              id: 'user_123',
              email: 'test@example.com',
              name: 'Test User',
            },
          },
          error: null,
        }),
      })

      const result = await auth.session()

      expect(result.ok).toBe(true)
      expect(result.data?.user.email).toBe('test@example.com')
    })

    it('should handle unauthorized session', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: false,
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        }),
      })

      const result = await auth.session()

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })
  })

  describe('Token Refresh', () => {
    it('should refresh tokens', async () => {
      // First set a refresh token
      await auth.api.setTokens({
        access_token: 'old_token',
        refresh_token: 'refresh_token_123',
        expires_in: 3600,
      })

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            tokens: {
              access_token: 'new_token_123',
              refresh_token: 'new_refresh_123',
              expires_in: 3600,
            },
          },
          error: null,
        }),
      })

      const result = await auth.refresh()

      expect(result.ok).toBe(true)
      expect(result.data?.tokens.access_token).toBe('new_token_123')
    })
  })

  describe('isAuthenticated', () => {
    it('should return false when no token', async () => {
      const isAuth = await auth.isAuthenticated()
      expect(isAuth).toBe(false)
    })

    it('should return true when valid token exists', async () => {
      // Sign in to get tokens
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            user: { id: 'user_123', email: 'test@example.com' },
            tokens: {
              access_token: 'token_123',
              refresh_token: 'refresh_123',
              expires_in: 3600,
            },
          },
          error: null,
        }),
      })

      await auth.signIn('password', {
        email: 'test@example.com',
        password: 'password123',
      })

      const isAuth = await auth.isAuthenticated()
      expect(isAuth).toBe(true)
    })

    it('should try to refresh when token is expired', async () => {
      // Set expired token
      await auth.api.setTokens({
        access_token: 'expired_token',
        refresh_token: 'refresh_123',
        expires_in: -1, // Already expired
      })

      // Mock successful refresh
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            tokens: {
              access_token: 'new_token',
              refresh_token: 'refresh_123',
              expires_in: 3600,
            },
          },
          error: null,
        }),
      })

      const isAuth = await auth.isAuthenticated()

      expect(isAuth).toBe(true)
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should return false when refresh fails', async () => {
      // Set expired token
      await auth.api.setTokens({
        access_token: 'expired_token',
        refresh_token: 'refresh_123',
        expires_in: -1,
      })

      // Mock failed refresh
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: false,
          data: null,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Refresh token invalid',
          },
        }),
      })

      const isAuth = await auth.isAuthenticated()

      expect(isAuth).toBe(false)
    })
  })

  describe('Plugin System', () => {
    it('should install plugins', async () => {
      const mockPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        install: vi.fn(),
      }

      await auth.plugin('test-plugin', mockPlugin)

      expect(mockPlugin.install).toHaveBeenCalledWith(
        expect.objectContaining({
          client: auth.api,
          core: expect.any(Object),
          sdk: auth,
        })
      )
    })

    it('should add methods through plugins', async () => {
      const totpPlugin: Plugin = {
        name: 'totp',
        version: '1.0.0',
        install({ sdk }) {
          (sdk as any).totpEnable = async () => {
            return { ok: true, data: {}, error: null }
          }
        },
      }

      await auth.plugin('totp', totpPlugin)

      expect((auth as any).totpEnable).toBeDefined()
      const result = await (auth as any).totpEnable()
      expect(result.ok).toBe(true)
    })

    it('should warn when installing same plugin twice', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const mockPlugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        install: vi.fn(),
      }

      await auth.plugin('test-plugin', mockPlugin)
      await auth.plugin('test-plugin', mockPlugin)

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('already installed')
      )

      consoleWarn.mockRestore()
    })
  })

  describe('getToken', () => {
    it('should return null when no token', async () => {
      const token = await auth.getToken()
      expect(token).toBeNull()
    })

    it('should return token when authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            user: { id: 'user_123', email: 'test@example.com' },
            tokens: {
              access_token: 'token_123',
              refresh_token: 'refresh_123',
              expires_in: 3600,
            },
          },
          error: null,
        }),
      })

      await auth.signIn('password', {
        email: 'test@example.com',
        password: 'password123',
      })

      const token = await auth.getToken()
      expect(token).toBe('token_123')
    })
  })
})
