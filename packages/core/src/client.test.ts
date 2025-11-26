import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ApiClient } from './client'
import { MemoryStorageAdapter } from './storage'
import type { AuthTokens } from './types'

describe('ApiClient', () => {
  let client: ApiClient
  let storage: MemoryStorageAdapter
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    storage = new MemoryStorageAdapter()
    mockFetch = vi.fn()

    client = new ApiClient({
      baseURL: 'https://api.example.com/auth',
      storage,
      fetch: mockFetch as any,
      storageKeyPrefix: 'test_',
    })
  })

  describe('Token Management', () => {
    const mockTokens: AuthTokens = {
      access_token: 'access_123',
      refresh_token: 'refresh_456',
      expires_in: 3600,
    }

    it('should store tokens correctly', async () => {
      await client.setTokens(mockTokens)

      const accessToken = await client.getAccessToken()
      const refreshToken = await client.getRefreshToken()

      expect(accessToken).toBe('access_123')
      expect(refreshToken).toBe('refresh_456')
    })

    it('should clear tokens', async () => {
      await client.setTokens(mockTokens)
      await client.clearTokens()

      const accessToken = await client.getAccessToken()
      const refreshToken = await client.getRefreshToken()

      expect(accessToken).toBeNull()
      expect(refreshToken).toBeNull()
    })

    it('should detect expired tokens', async () => {
      const expiredTokens: AuthTokens = {
        access_token: 'access_123',
        refresh_token: 'refresh_456',
        expires_in: -1, // Already expired
      }

      await client.setTokens(expiredTokens)
      const isExpired = await client.isTokenExpired()

      expect(isExpired).toBe(true)
    })

    it('should detect valid tokens', async () => {
      const validTokens: AuthTokens = {
        access_token: 'access_123',
        refresh_token: 'refresh_456',
        expires_in: 3600, // 1 hour from now
      }

      await client.setTokens(validTokens)
      const isExpired = await client.isTokenExpired()

      expect(isExpired).toBe(false)
    })

    it('should call onTokenRefresh callback', async () => {
      const onTokenRefresh = vi.fn()

      const clientWithCallback = new ApiClient({
        baseURL: 'https://api.example.com/auth',
        storage,
        fetch: mockFetch as any,
        onTokenRefresh,
      })

      await clientWithCallback.setTokens(mockTokens)

      expect(onTokenRefresh).toHaveBeenCalledWith(mockTokens)
    })
  })

  describe('API Requests', () => {
    it('should make GET requests', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: { message: 'success' },
          error: null,
        }),
      })

      const result = await client.req('/test', null, { method: 'GET' })

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
      expect(result.ok).toBe(true)
    })

    it('should make POST requests with body', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: { id: '123' },
          error: null,
        }),
      })

      const body = { email: 'test@example.com' }
      await client.req('/test', body)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      )
    })

    it('should attach authorization header', async () => {
      await client.setTokens({
        access_token: 'token_123',
        refresh_token: 'refresh_456',
        expires_in: 3600,
      })

      mockFetch.mockResolvedValueOnce({
        json: async () => ({ ok: true, data: {}, error: null }),
      })

      await client.req('/test')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token_123',
          }),
        })
      )
    })

    it('should skip auth when skipAuth is true', async () => {
      await client.setTokens({
        access_token: 'token_123',
        refresh_token: 'refresh_456',
        expires_in: 3600,
      })

      mockFetch.mockResolvedValueOnce({
        json: async () => ({ ok: true, data: {}, error: null }),
      })

      await client.req('/test', null, { skipAuth: true })

      const call = mockFetch.mock.calls[0]
      const headers = call[1].headers

      expect(headers.Authorization).toBeUndefined()
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      const result = await client.req('/test')

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('NETWORK_ERROR')
      expect(result.error?.message).toContain('Network failure')
    })
  })

  describe('Token Refresh', () => {
    it('should refresh tokens successfully', async () => {
      await client.setTokens({
        access_token: 'old_token',
        refresh_token: 'refresh_123',
        expires_in: 3600,
      })

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

      const result = await client.refresh()

      expect(result.ok).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/auth/token/refresh',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ refresh_token: 'refresh_123' }),
        })
      )

      const newToken = await client.getAccessToken()
      expect(newToken).toBe('new_token')
    })

    it('should handle refresh failure', async () => {
      await client.setTokens({
        access_token: 'old_token',
        refresh_token: 'refresh_123',
        expires_in: 3600,
      })

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

      const result = await client.refresh()

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('INVALID_TOKEN')
    })

    it('should return error when no refresh token', async () => {
      const result = await client.refresh()

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('NO_REFRESH_TOKEN')
    })

    it('should only refresh once for concurrent requests', async () => {
      await client.setTokens({
        access_token: 'old_token',
        refresh_token: 'refresh_123',
        expires_in: 3600,
      })

      mockFetch.mockResolvedValue({
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

      // Make multiple concurrent refresh calls
      const promises = [client.refresh(), client.refresh(), client.refresh()]

      await Promise.all(promises)

      // Should only call fetch once
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Automatic Token Refresh on 401', () => {
    it('should auto-refresh and retry on 401', async () => {
      await client.setTokens({
        access_token: 'old_token',
        refresh_token: 'refresh_123',
        expires_in: 3600,
      })

      // First call returns 401
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

      // Refresh call
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

      // Retry with new token
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          data: { message: 'success' },
          error: null,
        }),
      })

      const result = await client.req('/protected')

      expect(result.ok).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(3) // Original + refresh + retry
    })

    it('should not retry when skipRefresh is true', async () => {
      await client.setTokens({
        access_token: 'old_token',
        refresh_token: 'refresh_123',
        expires_in: 3600,
      })

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

      const result = await client.req('/protected', null, { skipRefresh: true })

      expect(result.ok).toBe(false)
      expect(mockFetch).toHaveBeenCalledTimes(1) // No retry
    })
  })

  describe('Configuration', () => {
    it('should use custom storage key prefix', async () => {
      const customClient = new ApiClient({
        baseURL: 'https://api.example.com/auth',
        storage,
        fetch: mockFetch as any,
        storageKeyPrefix: 'custom_prefix_',
      })

      await customClient.setTokens({
        access_token: 'token_123',
        refresh_token: 'refresh_456',
        expires_in: 3600,
      })

      expect(storage.getItem('custom_prefix_access_token')).toBe('token_123')
    })

    it('should call onAuthError callback', async () => {
      const onAuthError = vi.fn()

      const clientWithCallback = new ApiClient({
        baseURL: 'https://api.example.com/auth',
        storage,
        fetch: mockFetch as any,
        onAuthError,
      })

      await clientWithCallback.setTokens({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 3600,
      })

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

      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: false,
          data: null,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Refresh failed',
          },
        }),
      })

      await clientWithCallback.req('/protected')

      expect(onAuthError).toHaveBeenCalled()
    })
  })
})
