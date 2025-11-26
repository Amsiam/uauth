/**
 * OAuth2 Plugin Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OAuth2Plugin, createOAuth2Plugin } from './oauth2';
import type { PluginContext, ApiResponse } from '../types';

// Mock window object
const mockWindow = {
  location: {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
  },
  open: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  setInterval: vi.fn(() => 123),
  clearInterval: vi.fn(),
  opener: null,
  postMessage: vi.fn(),
};

// Mock localStorage
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
};

// Mock crypto
const mockCrypto = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
};

describe('OAuth2Plugin', () => {
  let plugin: OAuth2Plugin;
  let mockContext: PluginContext;
  let mockSignIn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Setup global mocks
    vi.stubGlobal('window', mockWindow);
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.stubGlobal('crypto', mockCrypto);

    // Reset mocks
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);

    // Create mock context
    mockSignIn = vi.fn();
    mockContext = {
      client: {
        req: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            providers: [
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
            ],
          },
          error: null,
        }),
      },
      core: {} as any,
      sdk: {
        signIn: mockSignIn,
      } as any,
    };

    plugin = new OAuth2Plugin();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('createOAuth2Plugin', () => {
    it('should create an OAuth2Plugin instance', () => {
      const plugin = createOAuth2Plugin();
      expect(plugin).toBeInstanceOf(OAuth2Plugin);
      expect(plugin.name).toBe('oauth2');
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('install', () => {
    it('should add oauth2 methods to SDK', async () => {
      await plugin.install(mockContext);

      const sdk = mockContext.sdk as any;
      expect(sdk.oauth2).toBeDefined();
      expect(sdk.oauth2.loadProviders).toBeDefined();
      expect(sdk.oauth2.getProviders).toBeDefined();
      expect(sdk.oauth2.signInWithPopup).toBeDefined();
      expect(sdk.oauth2.signInWithRedirect).toBeDefined();
      expect(sdk.oauth2.handleCallback).toBeDefined();
      expect(sdk.oauth2.getAuthorizationUrl).toBeDefined();
    });

    it('should auto-load providers on install', async () => {
      await plugin.install(mockContext);

      expect(mockContext.client.req).toHaveBeenCalledWith(
        '/providers',
        undefined,
        { method: 'GET', skipAuth: true }
      );
    });
  });

  describe('loadProviders', () => {
    it('should load providers from backend', async () => {
      await plugin.install(mockContext);

      const providers = await plugin.loadProviders();

      expect(providers).toHaveLength(2);
      expect(providers[0].name).toBe('google');
      expect(providers[1].name).toBe('github');
    });

    it('should throw if plugin not installed', async () => {
      await expect(plugin.loadProviders()).rejects.toThrow('OAuth2 plugin not installed');
    });

    it('should throw on backend error', async () => {
      (mockContext.client.req as any).mockResolvedValueOnce({
        ok: false,
        data: null,
        error: { code: 'ERROR', message: 'Failed to load providers' },
      });

      await plugin.install(mockContext);

      // Reset the mock to fail on second call
      (mockContext.client.req as any).mockResolvedValueOnce({
        ok: false,
        data: null,
        error: { code: 'ERROR', message: 'Failed to load providers' },
      });

      await expect(plugin.loadProviders()).rejects.toThrow('Failed to load OAuth2 providers');
    });
  });

  describe('getProviders', () => {
    it('should return loaded providers', async () => {
      await plugin.install(mockContext);

      const providers = plugin.getProviders();

      expect(providers).toHaveLength(2);
      expect(providers.map((p) => p.name)).toContain('google');
      expect(providers.map((p) => p.name)).toContain('github');
    });

    it('should return empty array before loading', () => {
      const providers = plugin.getProviders();
      expect(providers).toHaveLength(0);
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL', async () => {
      await plugin.install(mockContext);

      const url = plugin.getAuthorizationUrl({ provider: 'google' });

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=google-client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=openid+email+profile');
      expect(url).toContain('state=');
    });

    it('should use custom redirect_uri', async () => {
      await plugin.install(mockContext);

      const url = plugin.getAuthorizationUrl({
        provider: 'google',
        redirectUri: 'http://custom.com/callback',
      });

      expect(url).toContain('redirect_uri=http%3A%2F%2Fcustom.com%2Fcallback');
    });

    it('should use custom state', async () => {
      await plugin.install(mockContext);

      const url = plugin.getAuthorizationUrl({
        provider: 'google',
        state: 'custom-state-123',
      });

      expect(url).toContain('state=custom-state-123');
    });

    it('should throw if provider not found', async () => {
      await plugin.install(mockContext);

      expect(() => plugin.getAuthorizationUrl({ provider: 'unknown' })).toThrow(
        'OAuth2 provider "unknown" not found'
      );
    });
  });

  describe('signInWithPopup', () => {
    it('should return error in non-browser environment', async () => {
      vi.stubGlobal('window', undefined);
      await plugin.install(mockContext);

      const result = await plugin.signInWithPopup({ provider: 'google' });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('NOT_BROWSER');
    });

    it('should return error if popup is blocked', async () => {
      mockWindow.open.mockReturnValue(null);
      await plugin.install(mockContext);

      const result = await plugin.signInWithPopup({ provider: 'google' });

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('POPUP_BLOCKED');
    });

    it('should open popup with correct URL', async () => {
      const mockPopup = { closed: false };
      mockWindow.open.mockReturnValue(mockPopup);
      await plugin.install(mockContext);

      // Start popup flow (don't await, it waits for callback)
      plugin.signInWithPopup({ provider: 'google' });

      expect(mockWindow.open).toHaveBeenCalled();
      const openCall = mockWindow.open.mock.calls[0];
      expect(openCall[0]).toContain('accounts.google.com');
      expect(openCall[1]).toBe('OAuth2 Sign In');
    });
  });

  describe('signInWithRedirect', () => {
    it('should throw in non-browser environment', async () => {
      vi.stubGlobal('window', undefined);
      await plugin.install(mockContext);

      await expect(plugin.signInWithRedirect({ provider: 'google' })).rejects.toThrow(
        'OAuth2 redirect flow requires a browser environment'
      );
    });

    it('should store state and provider in localStorage', async () => {
      await plugin.install(mockContext);

      // Mock window.location.href setter
      let capturedHref = '';
      Object.defineProperty(mockWindow.location, 'href', {
        set: (value) => {
          capturedHref = value;
        },
        get: () => capturedHref,
      });

      await plugin.signInWithRedirect({ provider: 'google' });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('oauth2_state', expect.any(String));
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('oauth2_provider', 'google');
    });
  });

  describe('handleCallback', () => {
    it('should return error in non-browser environment', async () => {
      vi.stubGlobal('window', undefined);
      await plugin.install(mockContext);

      const result = await plugin.handleCallback();

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('NOT_BROWSER');
    });

    it('should handle OAuth2 error in callback', async () => {
      await plugin.install(mockContext);

      const params = new URLSearchParams({
        error: 'access_denied',
        error_description: 'User denied access',
      });

      const result = await plugin.handleCallback(params);

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('OAUTH2_ERROR');
      expect(result.error?.message).toBe('User denied access');
    });

    it('should return error if no code in callback', async () => {
      await plugin.install(mockContext);

      const params = new URLSearchParams({});

      const result = await plugin.handleCallback(params);

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('NO_CODE');
    });

    it('should return error on state mismatch', async () => {
      await plugin.install(mockContext);

      mockStorage['oauth2_state'] = 'original-state';
      mockStorage['oauth2_provider'] = 'google';

      const params = new URLSearchParams({
        code: 'auth-code',
        state: 'different-state',
      });

      const result = await plugin.handleCallback(params);

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('STATE_MISMATCH');
    });

    it('should return error if provider not in storage', async () => {
      await plugin.install(mockContext);

      mockStorage['oauth2_state'] = 'test-state';
      // No oauth2_provider in storage

      const params = new URLSearchParams({
        code: 'auth-code',
        state: 'test-state',
      });

      const result = await plugin.handleCallback(params);

      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe('NO_PROVIDER');
    });

    it('should exchange code and sign in on success', async () => {
      await plugin.install(mockContext);

      mockStorage['oauth2_state'] = 'test-state';
      mockStorage['oauth2_provider'] = 'google';

      mockSignIn.mockResolvedValue({
        ok: true,
        data: {
          user: { id: 'user-1', email: 'test@example.com' },
          tokens: { access_token: 'token', refresh_token: 'refresh', expires_in: 3600 },
        },
        error: null,
      });

      const params = new URLSearchParams({
        code: 'auth-code',
        state: 'test-state',
      });

      const result = await plugin.handleCallback(params);

      expect(result.ok).toBe(true);
      expect(mockSignIn).toHaveBeenCalledWith('oauth2', {
        provider: 'google',
        code: 'auth-code',
        redirect_uri: undefined,
      });

      // Check cleanup
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('oauth2_state');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('oauth2_provider');
    });

    it('should post message to opener in popup flow', async () => {
      mockWindow.opener = { postMessage: vi.fn() };
      await plugin.install(mockContext);

      const params = new URLSearchParams({
        code: 'auth-code',
        state: 'test-state',
      });

      const result = await plugin.handleCallback(params);

      expect(mockWindow.opener.postMessage).toHaveBeenCalledWith(
        {
          code: 'auth-code',
          state: 'test-state',
          error: null,
          error_description: null,
        },
        'http://localhost:3000'
      );
      expect(result.error?.code).toBe('POPUP_FLOW');

      // Reset
      mockWindow.opener = null;
    });
  });
});
