import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAuthMiddleware, createGlobalAuthMiddleware, createAuthBeforeLoad } from './middleware'
import * as server from './server'

// Mock dependencies
vi.mock('@tanstack/react-start', () => ({
  createMiddleware: vi.fn().mockReturnValue({
    server: vi.fn((cb) => cb),
  }),
  createServerFn: vi.fn().mockReturnValue({
    middleware: vi.fn().mockReturnThis(),
    validator: vi.fn().mockReturnThis(),
    inputValidator: vi.fn().mockReturnThis(),
    handler: vi.fn(),
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  redirect: vi.fn((opts) => ({ ...opts, isRedirect: true })),
}))

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createAuthMiddleware', () => {
    it('should pass user to context if authenticated', async () => {
      const mockUser = { id: '1', email: 'test@example.com' }
      vi.spyOn(server, 'getSessionFn').mockResolvedValue({ user: mockUser } as any)

      const middleware = createAuthMiddleware()
      // @ts-ignore - mock implementation returns the callback directly
      const result = await middleware({ next: vi.fn((opts) => opts) })

      expect(result.context).toEqual({
        user: mockUser,
        accessToken: undefined,
      })
    })

    it('should throw if unauthenticated', async () => {
      vi.spyOn(server, 'getSessionFn').mockResolvedValue(null)

      const middleware = createAuthMiddleware()
      // @ts-ignore
      await expect(middleware({ next: vi.fn() })).rejects.toThrow('Unauthorized')
    })

    it('should throw if session exists but no user', async () => {
      vi.spyOn(server, 'getSessionFn').mockResolvedValue({ user: null } as any)

      const middleware = createAuthMiddleware()
      // @ts-ignore
      await expect(middleware({ next: vi.fn() })).rejects.toThrow('Unauthorized')
    })
  })

  describe('createGlobalAuthMiddleware', () => {
    it('should add auth context without blocking', async () => {
      const mockUser = { id: '1', email: 'test@example.com' }
      vi.spyOn(server, 'getSessionFn').mockResolvedValue({ user: mockUser } as any)

      const middleware = createGlobalAuthMiddleware()
      // @ts-ignore
      const result = await middleware({ next: vi.fn((opts) => opts) })

      expect(result.context).toEqual({
        user: mockUser,
        isAuthenticated: true,
      })
    })

    it('should handle null session gracefully', async () => {
      vi.spyOn(server, 'getSessionFn').mockResolvedValue(null)

      const middleware = createGlobalAuthMiddleware()
      // @ts-ignore
      const result = await middleware({ next: vi.fn((opts) => opts) })

      expect(result.context).toEqual({
        user: null,
        isAuthenticated: false,
      })
    })
  })

  describe('createAuthBeforeLoad', () => {
    it('should return user if authenticated via context (optimization)', async () => {
      const mockUser = { id: '1', email: 'test@example.com' }
      const beforeLoad = createAuthBeforeLoad()
      
      const result = await beforeLoad({ 
        context: { isAuthenticated: true, user: mockUser } 
      } as any)

      expect(result).toEqual({
        user: mockUser,
        isAuthenticated: true,
      })
      expect(server.getSessionFn).not.toHaveBeenCalled()
    })

    it('should throw redirect if unauthenticated', async () => {
      const beforeLoad = createAuthBeforeLoad()
      
      await expect(beforeLoad({ context: {} } as any)).rejects.toEqual(expect.objectContaining({
        to: '/login',
        isRedirect: true
      }))
    })

    it('should use custom redirect path', async () => {
      const beforeLoad = createAuthBeforeLoad({ redirectTo: '/signin' })
      
      await expect(beforeLoad({ context: {} } as any)).rejects.toEqual(expect.objectContaining({
        to: '/signin',
        isRedirect: true
      }))
    })
  })
})
