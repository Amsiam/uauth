import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ServerAuth, createServerAuth } from './server-auth'

describe('ServerAuth', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let serverAuth: ServerAuth

  beforeEach(() => {
    mockFetch = vi.fn()

    serverAuth = new ServerAuth({
      baseURL: 'https://api.example.com/auth',
      fetch: mockFetch as any,
      cookieName: 'auth_token',
    })
  })

  describe('getSession', () => {
    it('should return error when no cookie header', async () => {
      const result = await serverAuth.getSession(null)

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('NO_TOKEN')
    })

    it('should return error when cookie not found', async () => {
      const result = await serverAuth.getSession('other_cookie=value')

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('NO_TOKEN')
    })

    it('should fetch session with token from cookie', async () => {
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

      const result = await serverAuth.getSession('auth_token=token_abc123')

      expect(result.ok).toBe(true)
      expect(result.data?.user.email).toBe('test@example.com')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/session',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer token_abc123',
          }),
        })
      )
    })

    it('should handle multiple cookies', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            user: {
              id: 'user_123',
              email: 'test@example.com',
            },
          },
          error: null,
        }),
      })

      await serverAuth.getSession(
        'other=value; auth_token=token_123; another=test'
      )

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token_123',
          }),
        })
      )
    })

    it('should handle session error', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: false,
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid token',
          },
        }),
      })

      const result = await serverAuth.getSession('auth_token=invalid_token')

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('should handle fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await serverAuth.getSession('auth_token=token_123')

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('SESSION_ERROR')
      expect(result.error?.message).toContain('Network error')
    })
  })

  describe('getSessionFromRequest', () => {
    it('should extract cookie from Request object', async () => {
      const mockRequest = new Request('https://example.com', {
        headers: {
          cookie: 'auth_token=token_xyz',
        },
      })

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            user: {
              id: 'user_123',
              email: 'test@example.com',
            },
          },
          error: null,
        }),
      })

      const result = await serverAuth.getSessionFromRequest(mockRequest)

      expect(result.ok).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token_xyz',
          }),
        })
      )
    })

    it('should handle request without cookies', async () => {
      const mockRequest = new Request('https://example.com')

      const result = await serverAuth.getSessionFromRequest(mockRequest)

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('NO_TOKEN')
    })
  })

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: {
            user: {
              id: 'user_123',
              email: 'test@example.com',
            },
          },
          error: null,
        }),
      })

      const result = await serverAuth.verifyToken('valid_token_123')

      expect(result.ok).toBe(true)
      expect(result.data?.user.id).toBe('user_123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/session',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid_token_123',
          }),
        })
      )
    })

    it('should handle invalid token', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: false,
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token expired',
          },
        }),
      })

      const result = await serverAuth.verifyToken('invalid_token')

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('UNAUTHORIZED')
    })

    it('should handle verification error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'))

      const result = await serverAuth.verifyToken('token_123')

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('VERIFY_ERROR')
    })
  })

  describe('Configuration', () => {
    it('should use custom cookie name', async () => {
      const customAuth = new ServerAuth({
        baseURL: 'https://api.example.com/auth',
        fetch: mockFetch as any,
        cookieName: 'custom_auth',
      })

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: { user: { id: '123', email: 'test@example.com' } },
          error: null,
        }),
      })

      await customAuth.getSession('custom_auth=token_123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token_123',
          }),
        })
      )
    })

    it('should use default cookie name when not specified', async () => {
      const defaultAuth = new ServerAuth({
        baseURL: 'https://api.example.com/auth',
        fetch: mockFetch as any,
      })

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: { user: { id: '123', email: 'test@example.com' } },
          error: null,
        }),
      })

      await defaultAuth.getSession('auth_token=token_123')

      expect(mockFetch).toHaveBeenCalled()
    })

    it('should strip trailing slash from baseURL', async () => {
      const auth = new ServerAuth({
        baseURL: 'https://api.example.com/auth/',
        fetch: mockFetch as any,
      })

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: { user: { id: '123', email: 'test@example.com' } },
          error: null,
        }),
      })

      await auth.getSession('auth_token=token_123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/session',
        expect.any(Object)
      )
    })
  })
})

describe('createServerAuth', () => {
  it('should create ServerAuth instance', () => {
    const auth = createServerAuth({
      baseURL: 'https://api.example.com/auth',
    })

    expect(auth).toBeInstanceOf(ServerAuth)
  })

  it('should pass config to ServerAuth', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({
        ok: true,
        data: { user: { id: '123', email: 'test@example.com' } },
        error: null,
      }),
    })

    const auth = createServerAuth({
      baseURL: 'https://api.example.com/auth',
      fetch: mockFetch as any,
      cookieName: 'custom_cookie',
    })

    await auth.getSession('custom_cookie=token_123')

    expect(mockFetch).toHaveBeenCalled()
  })
})
