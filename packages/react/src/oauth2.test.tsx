/**
 * Tests for OAuth2 React components
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import {
  OAuth2Provider,
  useOAuth2,
  OAuthButton,
  OAuthButtons,
  OAuthCallback,
} from './oauth2';
import { AuthProvider } from './context';
import type { UniversalAuth, OAuth2Provider as OAuth2ProviderType } from '@uauth/core';

// Mock providers
const mockProviders: OAuth2ProviderType[] = [
  {
    name: 'google',
    displayName: 'Google',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientId: 'google-client-id',
    scope: 'openid email profile',
  },
  {
    name: 'github',
    displayName: 'GitHub',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    clientId: 'github-client-id',
    scope: 'user:email',
  },
];

// Create mock auth with OAuth2 plugin
function createMockAuth(overrides: Partial<any> = {}): UniversalAuth {
  const mockOAuth2 = {
    loadProviders: vi.fn().mockResolvedValue(mockProviders),
    getProviders: vi.fn().mockReturnValue(mockProviders),
    signInWithPopup: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
        tokens: { access_token: 'token', refresh_token: 'refresh', expires_in: 3600 },
      },
      error: null,
    }),
    signInWithRedirect: vi.fn().mockResolvedValue(undefined),
    handleCallback: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
        tokens: { access_token: 'token', refresh_token: 'refresh', expires_in: 3600 },
      },
      error: null,
    }),
    ...overrides.oauth2,
  };

  return {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    session: vi.fn().mockResolvedValue({ ok: true, data: null, error: null }),
    refresh: vi.fn(),
    isAuthenticated: vi.fn().mockResolvedValue(false),
    getToken: vi.fn(),
    plugin: vi.fn(),
    api: {} as any,
    oauth2: mockOAuth2,
    ...overrides,
  } as unknown as UniversalAuth;
}

// Wrapper component for tests
function TestWrapper({
  auth,
  children,
  loadOAuth2OnMount = false,
}: {
  auth: UniversalAuth;
  children: React.ReactNode;
  loadOAuth2OnMount?: boolean;
}) {
  return (
    <AuthProvider auth={auth} loadOnMount={false}>
      <OAuth2Provider auth={auth} loadOnMount={loadOAuth2OnMount}>
        {children}
      </OAuth2Provider>
    </AuthProvider>
  );
}

describe('OAuth2Provider', () => {
  it('should render children', () => {
    const auth = createMockAuth();

    render(
      <TestWrapper auth={auth}>
        <div>Test Content</div>
      </TestWrapper>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should load providers on mount when loadOnMount is true', async () => {
    const auth = createMockAuth({
      oauth2: {
        loadProviders: vi.fn().mockResolvedValue(mockProviders),
        getProviders: vi.fn().mockReturnValue([]), // Empty initially
        signInWithPopup: vi.fn(),
        signInWithRedirect: vi.fn(),
        handleCallback: vi.fn(),
      },
    });

    render(
      <AuthProvider auth={auth} loadOnMount={false}>
        <OAuth2Provider auth={auth} loadOnMount={true}>
          <div>Test</div>
        </OAuth2Provider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect((auth as any).oauth2.loadProviders).toHaveBeenCalled();
    });
  });
});

describe('useOAuth2', () => {
  it('should throw error when used outside OAuth2Provider', () => {
    const TestComponent = () => {
      useOAuth2();
      return null;
    };

    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      'useOAuth2 must be used within an OAuth2Provider'
    );

    spy.mockRestore();
  });

  it('should provide OAuth2 context value', async () => {
    const auth = createMockAuth();
    let contextValue: any;

    const TestComponent = () => {
      contextValue = useOAuth2();
      return <div>Test</div>;
    };

    render(
      <TestWrapper auth={auth}>
        <TestComponent />
      </TestWrapper>
    );

    expect(contextValue).toBeDefined();
    expect(contextValue.providers).toBeDefined();
    expect(contextValue.isLoading).toBeDefined();
    expect(contextValue.signInWithPopup).toBeDefined();
    expect(contextValue.signInWithRedirect).toBeDefined();
    expect(contextValue.handleCallback).toBeDefined();
  });
});

describe('OAuthButton', () => {
  it('should render button with provider name', async () => {
    const auth = createMockAuth();

    render(
      <TestWrapper auth={auth} loadOAuth2OnMount={true}>
        <OAuthButton provider="google" />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  it('should render custom children', async () => {
    const auth = createMockAuth();

    render(
      <TestWrapper auth={auth} loadOAuth2OnMount={true}>
        <OAuthButton provider="google">
          <span>Custom Google Button</span>
        </OAuthButton>
      </TestWrapper>
    );

    expect(screen.getByText('Custom Google Button')).toBeInTheDocument();
  });

  it('should call signInWithPopup when clicked', async () => {
    const auth = createMockAuth();

    render(
      <TestWrapper auth={auth} loadOAuth2OnMount={true}>
        <OAuthButton provider="google" />
      </TestWrapper>
    );

    // Wait for providers to load and button to be enabled
    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect((auth as any).oauth2.signInWithPopup).toHaveBeenCalledWith({
        provider: 'google',
        redirectUri: undefined,
      });
    });
  });

  it('should call signInWithRedirect when useRedirect is true', async () => {
    const auth = createMockAuth();

    render(
      <TestWrapper auth={auth} loadOAuth2OnMount={true}>
        <OAuthButton provider="google" useRedirect={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect((auth as any).oauth2.signInWithRedirect).toHaveBeenCalledWith({
        provider: 'google',
        redirectUri: undefined,
      });
    });
  });

  it('should call onSuccess callback on successful sign in', async () => {
    const auth = createMockAuth();
    const onSuccess = vi.fn();

    render(
      <TestWrapper auth={auth} loadOAuth2OnMount={true}>
        <OAuthButton provider="google" onSuccess={onSuccess} />
      </TestWrapper>
    );

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({ email: 'test@example.com' }),
        })
      );
    });
  });

  it('should call onError callback on failed sign in', async () => {
    const auth = createMockAuth({
      oauth2: {
        loadProviders: vi.fn().mockResolvedValue(mockProviders),
        getProviders: vi.fn().mockReturnValue(mockProviders),
        signInWithPopup: vi.fn().mockResolvedValue({
          ok: false,
          data: null,
          error: { code: 'OAUTH_ERROR', message: 'Sign in failed' },
        }),
        signInWithRedirect: vi.fn(),
        handleCallback: vi.fn(),
      },
    });
    const onError = vi.fn();

    render(
      <TestWrapper auth={auth} loadOAuth2OnMount={true}>
        <OAuthButton provider="google" onError={onError} />
      </TestWrapper>
    );

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  it('should be disabled when disabled prop is true', () => {
    const auth = createMockAuth();

    render(
      <TestWrapper auth={auth}>
        <OAuthButton provider="google" disabled={true} />
      </TestWrapper>
    );

    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('OAuthButtons', () => {
  it('should render buttons for all providers', async () => {
    const auth = createMockAuth();

    render(
      <TestWrapper auth={auth} loadOAuth2OnMount={true}>
        <OAuthButtons />
      </TestWrapper>
    );

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should render nothing when no providers', async () => {
    const auth = createMockAuth({
      oauth2: {
        loadProviders: vi.fn().mockResolvedValue([]),
        getProviders: vi.fn().mockReturnValue([]),
        signInWithPopup: vi.fn(),
        signInWithRedirect: vi.fn(),
        handleCallback: vi.fn(),
      },
    });

    const { container } = render(
      <TestWrapper auth={auth} loadOAuth2OnMount={true}>
        <OAuthButtons />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should render nothing when providers array is empty
      expect(container.querySelector('button')).toBeNull();
    });
  });
});

describe('OAuthCallback', () => {
  it('should render loading component while processing', () => {
    const auth = createMockAuth({
      oauth2: {
        handleCallback: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
        loadProviders: vi.fn().mockResolvedValue(mockProviders),
        getProviders: vi.fn().mockReturnValue(mockProviders),
        signInWithPopup: vi.fn(),
        signInWithRedirect: vi.fn(),
      },
    });

    render(
      <TestWrapper auth={auth}>
        <OAuthCallback loadingComponent={<div>Loading...</div>} />
      </TestWrapper>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should call onSuccess after successful callback', async () => {
    const auth = createMockAuth();
    const onSuccess = vi.fn();

    render(
      <TestWrapper auth={auth}>
        <OAuthCallback onSuccess={onSuccess} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({ email: 'test@example.com' }),
        })
      );
    });
  });

  it('should call onError on failed callback', async () => {
    const auth = createMockAuth({
      oauth2: {
        handleCallback: vi.fn().mockResolvedValue({
          ok: false,
          data: null,
          error: { code: 'OAUTH_ERROR', message: 'Callback failed' },
        }),
        loadProviders: vi.fn().mockResolvedValue(mockProviders),
        getProviders: vi.fn().mockReturnValue(mockProviders),
        signInWithPopup: vi.fn(),
        signInWithRedirect: vi.fn(),
      },
    });
    const onError = vi.fn();

    render(
      <TestWrapper auth={auth}>
        <OAuthCallback onError={onError} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  it('should render error component on error', async () => {
    const auth = createMockAuth({
      oauth2: {
        handleCallback: vi.fn().mockResolvedValue({
          ok: false,
          data: null,
          error: { code: 'OAUTH_ERROR', message: 'Callback failed' },
        }),
        loadProviders: vi.fn().mockResolvedValue(mockProviders),
        getProviders: vi.fn().mockReturnValue(mockProviders),
        signInWithPopup: vi.fn(),
        signInWithRedirect: vi.fn(),
      },
    });

    render(
      <TestWrapper auth={auth}>
        <OAuthCallback
          errorComponent={(error) => <div>Error: {error.message}</div>}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Error: Callback failed')).toBeInTheDocument();
    });
  });

  it('should render children on success', async () => {
    const auth = createMockAuth();

    render(
      <TestWrapper auth={auth}>
        <OAuthCallback>
          <div>Success!</div>
        </OAuthCallback>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });
  });
});
