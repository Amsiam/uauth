import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRouteMatcher, authMiddleware } from './middleware'
import { NextRequest } from 'next/server'

// Mock the config module
vi.mock('./config', () => ({
  getConfig: () => ({
    baseURL: 'http://localhost:8000/auth',
    cookiePrefix: 'uauth_',
    cookies: {
      path: '/',
      domain: '',
      maxAge: 604800,
      secure: false,
      sameSite: 'lax',
    },
  }),
  getCookieName: (key: string) => `uauth_${key}`,
  COOKIE_NAMES: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    TOKEN_EXPIRY: 'token_expiry',
  },
}))

describe('createRouteMatcher', () => {
  it('should match exact paths', () => {
    const matcher = createRouteMatcher(['/dashboard', '/settings'])

    expect(matcher('/dashboard')).toBe(true)
    expect(matcher('/settings')).toBe(true)
    expect(matcher('/other')).toBe(false)
  })

  it('should match paths with single wildcard', () => {
    const matcher = createRouteMatcher(['/dashboard/*'])

    expect(matcher('/dashboard/users')).toBe(true)
    expect(matcher('/dashboard/settings')).toBe(true)
    expect(matcher('/dashboard')).toBe(true)
    expect(matcher('/other')).toBe(false)
  })

  it('should match paths with double wildcard', () => {
    const matcher = createRouteMatcher(['/admin/**'])

    expect(matcher('/admin')).toBe(true)
    expect(matcher('/admin/users')).toBe(true)
    expect(matcher('/admin/users/123')).toBe(true)
    expect(matcher('/admin/users/123/edit')).toBe(true)
    expect(matcher('/other')).toBe(false)
  })

  it('should match multiple patterns', () => {
    const matcher = createRouteMatcher(['/dashboard/**', '/settings', '/admin/*'])

    expect(matcher('/dashboard')).toBe(true)
    expect(matcher('/dashboard/test')).toBe(true)
    expect(matcher('/settings')).toBe(true)
    expect(matcher('/admin/test')).toBe(true)
    expect(matcher('/other')).toBe(false)
  })
})

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createMockRequest(pathname: string, cookies: Record<string, string> = {}) {
    const url = new URL(pathname, 'http://localhost:3000')
    const request = {
      nextUrl: url,
      url: url.toString(),
      cookies: {
        has: (name: string) => name in cookies,
        get: (name: string) => cookies[name] ? { value: cookies[name] } : undefined,
        getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
      },
    } as unknown as NextRequest

    return request
  }

  it('should allow access to public routes without token', async () => {
    const middleware = authMiddleware({
      protectedRoutes: ['/dashboard/**'],
      publicRoutes: ['/about'],
    })

    const request = createMockRequest('/about')
    const response = await middleware(request)

    expect(response).toEqual({ type: 'next' })
  })

  it('should redirect unauthenticated users from protected routes', async () => {
    const middleware = authMiddleware({
      protectedRoutes: ['/dashboard/**'],
    })

    const request = createMockRequest('/dashboard')
    const response = await middleware(request) as any

    expect(response.type).toBe('redirect')
    expect(response.url.pathname).toBe('/login')
    expect(response.url.searchParams.get('callbackUrl')).toBe('/dashboard')
  })

  it('should allow authenticated users to access protected routes', async () => {
    const middleware = authMiddleware({
      protectedRoutes: ['/dashboard/**'],
    })

    const request = createMockRequest('/dashboard', { uauth_access_token: 'test-token' })
    const response = await middleware(request)

    expect(response).toEqual({ type: 'next' })
  })

  it('should redirect authenticated users from login page', async () => {
    const middleware = authMiddleware({
      protectedRoutes: ['/dashboard/**'],
      afterLoginUrl: '/dashboard',
    })

    const request = createMockRequest('/login', { uauth_access_token: 'test-token' })
    const response = await middleware(request) as any

    expect(response.type).toBe('redirect')
    expect(response.url.pathname).toBe('/dashboard')
  })

  it('should use custom login URL', async () => {
    const middleware = authMiddleware({
      protectedRoutes: ['/dashboard/**'],
      loginUrl: '/auth/signin',
    })

    const request = createMockRequest('/dashboard')
    const response = await middleware(request) as any

    expect(response.type).toBe('redirect')
    expect(response.url.pathname).toBe('/auth/signin')
  })

  it('should allow default public routes', async () => {
    const middleware = authMiddleware({
      protectedRoutes: ['/dashboard/**'],
    })

    // Default public routes
    const publicRoutes = [
      '/login',
      '/signup',
      '/sign-in',
      '/sign-up',
      '/forgot-password',
      '/_next/static/chunk.js',
      '/favicon.ico',
    ]

    for (const route of publicRoutes) {
      const request = createMockRequest(route)
      const response = await middleware(request)
      expect(response).toEqual({ type: 'next' })
    }
  })
})
