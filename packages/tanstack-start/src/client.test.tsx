import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, render, screen } from '@testing-library/react'
import { useAuth, useOAuth, SignedIn, SignedOut, AuthGate } from './client'
import * as server from './server'

// Mock dependencies
vi.mock('@tanstack/react-router', () => ({
  useRouter: vi.fn(),
  useRouteContext: vi.fn(),
}))

import { useRouter, useRouteContext } from '@tanstack/react-router'

// Mock server functions
vi.mock('./server', () => ({
  signInFn: vi.fn(),
  signUpFn: vi.fn(),
  signOutFn: vi.fn(),
  getOAuthProvidersFn: vi.fn(),
  getOAuthUrlFn: vi.fn(),
  oauthSignInFn: vi.fn(),
}))

describe('client', () => {
  const mockRouter = {
    invalidate: vi.fn(),
    navigate: vi.fn(),
    state: { isLoading: false },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-ignore
    useRouter.mockReturnValue(mockRouter)
    // @ts-ignore
    useRouteContext.mockReturnValue({
      user: null,
      isAuthenticated: false,
    })
  })

  describe('useAuth', () => {
    it('should return context values', () => {
      const mockUser = { id: '1', email: 'test@example.com' }
      // @ts-ignore
      useRouteContext.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
      })

      const { result } = renderHook(() => useAuth())
      
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('signIn should call server function and invalidate router', async () => {
      // @ts-ignore
      server.signInFn.mockResolvedValue({ ok: true, data: { user: { id: '1' } } })
      
      const { result } = renderHook(() => useAuth())
      
      await act(async () => {
        const response = await result.current.signIn('test@test.com', 'pass')
        expect(response.ok).toBe(true)
      })
      
      expect(server.signInFn).toHaveBeenCalledWith({ data: { email: 'test@test.com', password: 'pass' } })
      expect(mockRouter.invalidate).toHaveBeenCalled()
    })

    it('signOut should call server function and navigate home', async () => {
      // @ts-ignore
      server.signOutFn.mockResolvedValue(undefined)
      
      // Mock window.location
      const originalLocation = window.location
      delete (window as any).location
      window.location = { href: '' } as any

      const { result } = renderHook(() => useAuth())
      
      await act(async () => {
        await result.current.signOut()
      })
      
      expect(server.signOutFn).toHaveBeenCalled()
      expect(window.location.href).toBe('/')
      
      // Restore window.location
      window.location = originalLocation
    })
  })

  describe('useOAuth', () => {
    it('should load providers on mount', async () => {
      const mockProviders = [{ name: 'google', displayName: 'Google' }]
      // @ts-ignore
      server.getOAuthProvidersFn.mockResolvedValue(mockProviders)
      
      const { result } = renderHook(() => useOAuth())
      
      // Wait for effect
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      expect(result.current.providers).toEqual(mockProviders)
    })
  })

  describe('Components', () => {
    it('SignedIn should render children when authenticated', () => {
      // @ts-ignore
      useRouteContext.mockReturnValue({ isAuthenticated: true })
      
      render(<SignedIn><div>Protected Content</div></SignedIn>)
      expect(screen.getByText('Protected Content')).toBeTruthy()
    })

    it('SignedIn should not render children when unauthenticated', () => {
      // @ts-ignore
      useRouteContext.mockReturnValue({ isAuthenticated: false })
      
      render(<SignedIn><div>Protected Content</div></SignedIn>)
      expect(screen.queryByText('Protected Content')).toBeNull()
    })

    it('SignedOut should render children when unauthenticated', () => {
      // @ts-ignore
      useRouteContext.mockReturnValue({ isAuthenticated: false })
      
      render(<SignedOut><div>Public Content</div></SignedOut>)
      expect(screen.getByText('Public Content')).toBeTruthy()
    })

    it('AuthGate should render children when authenticated', () => {
      // @ts-ignore
      useRouteContext.mockReturnValue({ isAuthenticated: true })
      
      render(<AuthGate><div>Protected</div></AuthGate>)
      expect(screen.getByText('Protected')).toBeTruthy()
    })

    it('AuthGate should render fallback when unauthenticated', () => {
      // @ts-ignore
      useRouteContext.mockReturnValue({ isAuthenticated: false })
      
      render(<AuthGate fallback={<div>Login required</div>}><div>Protected</div></AuthGate>)
      expect(screen.getByText('Login required')).toBeTruthy()
    })
  })
})
