import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { AuthProvider, useAuth } from './context'
import type { UniversalAuth, ApiResponse, SignInData, User } from '@uauth/core'

// Mock auth instance
const createMockAuth = (): UniversalAuth => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  session: vi.fn(),
  refresh: vi.fn(),
  isAuthenticated: vi.fn(),
  getToken: vi.fn(),
  plugin: vi.fn(),
  api: {} as any,
})

describe('AuthProvider', () => {
  let mockAuth: UniversalAuth

  beforeEach(() => {
    mockAuth = createMockAuth()
  })

  it('should render children', () => {
    render(
      <AuthProvider auth={mockAuth} loadOnMount={false}>
        <div>Test Content</div>
      </AuthProvider>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should load session on mount', async () => {
    const mockUser: User = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    }

    vi.mocked(mockAuth.isAuthenticated).mockResolvedValue(true)
    vi.mocked(mockAuth.session).mockResolvedValue({
      ok: true,
      data: { user: mockUser },
      error: null,
    })

    render(
      <AuthProvider auth={mockAuth} loadOnMount={true}>
        <div>Content</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockAuth.isAuthenticated).toHaveBeenCalled()
      expect(mockAuth.session).toHaveBeenCalled()
    })
  })

  it('should not load session when loadOnMount is false', () => {
    render(
      <AuthProvider auth={mockAuth} loadOnMount={false}>
        <div>Content</div>
      </AuthProvider>
    )

    expect(mockAuth.isAuthenticated).not.toHaveBeenCalled()
  })

  it('should handle session load error', async () => {
    vi.mocked(mockAuth.isAuthenticated).mockResolvedValue(true)
    vi.mocked(mockAuth.session).mockResolvedValue({
      ok: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Session expired',
      },
    })

    render(
      <AuthProvider auth={mockAuth} loadOnMount={true}>
        <div>Content</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockAuth.session).toHaveBeenCalled()
    })
  })
})

describe('useAuth', () => {
  let mockAuth: UniversalAuth

  beforeEach(() => {
    mockAuth = createMockAuth()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider auth={mockAuth} loadOnMount={false}>
      {children}
    </AuthProvider>
  )

  it('should throw error when used outside AuthProvider', () => {
    // Suppress console error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleError.mockRestore()
  })

  it('should provide initial auth state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should handle sign in', async () => {
    const mockUser: User = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    }

    const mockResponse: ApiResponse<SignInData> = {
      ok: true,
      data: {
        user: mockUser,
        tokens: {
          access_token: 'token_123',
          refresh_token: 'refresh_123',
          expires_in: 3600,
        },
      },
      error: null,
    }

    vi.mocked(mockAuth.signIn).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      const response = await result.current.signIn('password', {
        email: 'test@example.com',
        password: 'password123',
      })

      expect(response.ok).toBe(true)
    })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should handle sign in error', async () => {
    const mockResponse: ApiResponse<SignInData> = {
      ok: false,
      data: null,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      },
    }

    vi.mocked(mockAuth.signIn).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signIn('password', {
        email: 'test@example.com',
        password: 'wrong',
      })
    })

    await waitFor(() => {
      expect(result.current.error?.message).toBe('Invalid credentials')
      expect(result.current.user).toBeNull()
    })
  })

  it('should handle sign up', async () => {
    const mockUser: User = {
      id: 'user_123',
      email: 'new@example.com',
      name: 'New User',
    }

    const mockResponse: ApiResponse<SignInData> = {
      ok: true,
      data: {
        user: mockUser,
        tokens: {
          access_token: 'token_123',
          refresh_token: 'refresh_123',
          expires_in: 3600,
        },
      },
      error: null,
    }

    vi.mocked(mockAuth.signUp).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signUp({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      })
    })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  it('should handle sign out', async () => {
    const mockUser: User = {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    }

    // First sign in
    vi.mocked(mockAuth.signIn).mockResolvedValue({
      ok: true,
      data: {
        user: mockUser,
        tokens: {
          access_token: 'token_123',
          refresh_token: 'refresh_123',
          expires_in: 3600,
        },
      },
      error: null,
    })

    vi.mocked(mockAuth.signOut).mockResolvedValue({
      ok: true,
      data: { ok: true },
      error: null,
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    // Sign in first
    await act(async () => {
      await result.current.signIn('password', {
        email: 'test@example.com',
        password: 'password123',
      })
    })

    // Then sign out
    await act(async () => {
      await result.current.signOut()
    })

    await waitFor(() => {
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  it('should handle refresh', async () => {
    vi.mocked(mockAuth.refresh).mockResolvedValue({
      ok: true,
      data: {
        tokens: {
          access_token: 'new_token',
          refresh_token: 'new_refresh',
          expires_in: 3600,
        },
      },
      error: null,
    })

    vi.mocked(mockAuth.isAuthenticated).mockResolvedValue(true)
    vi.mocked(mockAuth.session).mockResolvedValue({
      ok: true,
      data: {
        user: {
          id: 'user_123',
          email: 'test@example.com',
        },
      },
      error: null,
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.refresh()
    })

    expect(mockAuth.refresh).toHaveBeenCalled()
  })

  it('should handle loading state', async () => {
    vi.mocked(mockAuth.signIn).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              data: {
                user: { id: '123', email: 'test@example.com' },
                tokens: {
                  access_token: 'token',
                  refresh_token: 'refresh',
                  expires_in: 3600,
                },
              },
              error: null,
            })
          }, 100)
        })
    )

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isLoading).toBe(false)

    act(() => {
      result.current.signIn('password', {
        email: 'test@example.com',
        password: 'password123',
      })
    })

    // Should be loading during request
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    // Should not be loading after request completes
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })
})
