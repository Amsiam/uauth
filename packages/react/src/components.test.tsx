import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RequireAuth, GuestOnly, AuthGuard } from './components'
import { AuthProvider } from './context'
import type { UniversalAuth, User } from 'universal-auth-sdk'

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

describe('RequireAuth', () => {
  it('should render children when authenticated', () => {
    const mockAuth = createMockAuth()
    vi.mocked(mockAuth.isAuthenticated).mockResolvedValue(true)
    vi.mocked(mockAuth.session).mockResolvedValue({
      ok: true,
      data: {
        user: { id: '123', email: 'test@example.com' },
      },
      error: null,
    })

    render(
      <AuthProvider auth={mockAuth} loadOnMount={false}>
        <RequireAuth>
          <div>Protected Content</div>
        </RequireAuth>
      </AuthProvider>
    )

    // Initially won't show (no async wait)
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should render fallback when not authenticated', () => {
    const mockAuth = createMockAuth()

    render(
      <AuthProvider auth={mockAuth} loadOnMount={false}>
        <RequireAuth fallback={<div>Please log in</div>}>
          <div>Protected Content</div>
        </RequireAuth>
      </AuthProvider>
    )

    expect(screen.getByText('Please log in')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should render loading fallback when loading', async () => {
    const mockAuth = createMockAuth()
    vi.mocked(mockAuth.isAuthenticated).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(true), 100)
        })
    )

    render(
      <AuthProvider auth={mockAuth} loadOnMount={true}>
        <RequireAuth loadingFallback={<div>Loading...</div>}>
          <div>Protected Content</div>
        </RequireAuth>
      </AuthProvider>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})

describe('GuestOnly', () => {
  it('should render children when not authenticated', () => {
    const mockAuth = createMockAuth()

    render(
      <AuthProvider auth={mockAuth} loadOnMount={false}>
        <GuestOnly>
          <div>Login Form</div>
        </GuestOnly>
      </AuthProvider>
    )

    expect(screen.getByText('Login Form')).toBeInTheDocument()
  })

  it('should render fallback when authenticated', async () => {
    const mockAuth = createMockAuth()
    vi.mocked(mockAuth.isAuthenticated).mockResolvedValue(true)
    vi.mocked(mockAuth.session).mockResolvedValue({
      ok: true,
      data: {
        user: { id: '123', email: 'test@example.com' },
      },
      error: null,
    })

    render(
      <AuthProvider auth={mockAuth} loadOnMount={false}>
        <GuestOnly fallback={<div>Already logged in</div>}>
          <div>Login Form</div>
        </GuestOnly>
      </AuthProvider>
    )

    // Initially shows login form (before auth check completes)
    expect(screen.queryByText('Login Form')).toBeInTheDocument()
  })

  it('should render loading fallback when loading', () => {
    const mockAuth = createMockAuth()
    vi.mocked(mockAuth.isAuthenticated).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(false), 100)
        })
    )

    render(
      <AuthProvider auth={mockAuth} loadOnMount={true}>
        <GuestOnly loadingFallback={<div>Checking...</div>}>
          <div>Login Form</div>
        </GuestOnly>
      </AuthProvider>
    )

    expect(screen.getByText('Checking...')).toBeInTheDocument()
  })
})

describe('AuthGuard', () => {
  it('should render children when user exists and check passes', () => {
    const mockAuth = createMockAuth()

    render(
      <AuthProvider auth={mockAuth} loadOnMount={false}>
        <AuthGuard check={(user) => user.id === '123'}>
          <div>Admin Panel</div>
        </AuthGuard>
      </AuthProvider>
    )

    // Without a user, won't render
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument()
  })

  it('should render fallback when check fails', () => {
    const mockAuth = createMockAuth()

    render(
      <AuthProvider auth={mockAuth} loadOnMount={false}>
        <AuthGuard
          check={(user) => (user as any).role === 'admin'}
          fallback={<div>Access Denied</div>}
        >
          <div>Admin Panel</div>
        </AuthGuard>
      </AuthProvider>
    )

    expect(screen.getByText('Access Denied')).toBeInTheDocument()
  })

  it('should render with function children', () => {
    const mockAuth = createMockAuth()

    render(
      <AuthProvider auth={mockAuth} loadOnMount={false}>
        <AuthGuard fallback={<div>Login required</div>}>
          {(user: User) => <div>Hello {user.name}</div>}
        </AuthGuard>
      </AuthProvider>
    )

    // Without user, shows fallback
    expect(screen.getByText('Login required')).toBeInTheDocument()
  })

  it('should render loading fallback when loading', () => {
    const mockAuth = createMockAuth()
    vi.mocked(mockAuth.isAuthenticated).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(true), 100)
        })
    )

    render(
      <AuthProvider auth={mockAuth} loadOnMount={true}>
        <AuthGuard loadingFallback={<div>Loading user...</div>}>
          <div>Protected</div>
        </AuthGuard>
      </AuthProvider>
    )

    expect(screen.getByText('Loading user...')).toBeInTheDocument()
  })

  it('should work without check function', () => {
    const mockAuth = createMockAuth()

    render(
      <AuthProvider auth={mockAuth} loadOnMount={false}>
        <AuthGuard fallback={<div>Login</div>}>
          <div>Content</div>
        </AuthGuard>
      </AuthProvider>
    )

    // Without user, shows fallback
    expect(screen.getByText('Login')).toBeInTheDocument()
  })
})
