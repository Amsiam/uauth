/**
 * OAuth2 Plugin for Universal Auth SDK
 * Fetches provider configuration from backend and handles OAuth2 flows
 */

import type {
  Plugin,
  PluginContext,
  ApiResponse,
  SignInData,
  User,
  OAuth2SignInPayload,
} from '../types';

/**
 * OAuth2 provider configuration from backend
 */
export interface OAuth2Provider {
  name: string;
  displayName?: string;
  authorizationUrl: string;
  clientId: string;
  scope?: string;
  redirectUri?: string;
  additionalParams?: Record<string, string>;
}

/**
 * OAuth2 providers response from backend
 */
export interface OAuth2ProvidersResponse {
  providers: OAuth2Provider[];
}

/**
 * OAuth2 flow options
 */
export interface OAuth2FlowOptions {
  provider: string;
  redirectUri?: string;
  state?: string;
  scope?: string;
  popup?: boolean;
  popupWidth?: number;
  popupHeight?: number;
}

/**
 * OAuth2 callback data
 */
export interface OAuth2CallbackData {
  code: string;
  state?: string;
  error?: string;
  error_description?: string;
}

/**
 * OAuth2 Plugin class
 */
export class OAuth2Plugin implements Plugin {
  name = 'oauth2';
  version = '1.0.0';

  private context?: PluginContext;
  private providers: Map<string, OAuth2Provider> = new Map();
  private providersLoaded = false;
  private popupWindow?: Window | null;
  private popupCheckInterval?: number;

  /**
   * Install the plugin
   */
  async install(context: PluginContext): Promise<void> {
    this.context = context;

    // Add helper methods to the SDK
    const sdk = context.sdk as any;

    // Expose OAuth2 methods
    sdk.oauth2 = {
      loadProviders: this.loadProviders.bind(this),
      getProviders: this.getProviders.bind(this),
      signInWithPopup: this.signInWithPopup.bind(this),
      signInWithRedirect: this.signInWithRedirect.bind(this),
      handleCallback: this.handleCallback.bind(this),
      getAuthorizationUrl: this.getAuthorizationUrl.bind(this),
      isCallback: this.isCallback.bind(this),
    };

    // Auto-handle OAuth callback if we're on a callback URL (popup flow)
    if (typeof window !== 'undefined' && this.isCallback()) {
      // If we're in a popup, send message to opener immediately
      if (window.opener) {
        const params = new URLSearchParams(window.location.search);
        window.opener.postMessage(
          {
            type: 'oauth2_callback',
            code: params.get('code'),
            state: params.get('state'),
            error: params.get('error'),
            error_description: params.get('error_description'),
          },
          window.location.origin
        );
        window.close();
        return; // Don't continue with plugin setup in popup
      }
    }

    // Optionally auto-load providers
    try {
      await this.loadProviders();
    } catch (error) {
      // Fail silently, providers can be loaded later
      console.warn('Failed to auto-load OAuth2 providers:', error);
    }
  }

  /**
   * Check if current URL is an OAuth callback
   */
  isCallback(): boolean {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return (
      window.location.pathname.includes('/callback') &&
      (params.has('code') || params.has('error'))
    );
  }

  /**
   * Load available OAuth2 providers from backend
   */
  async loadProviders(): Promise<OAuth2Provider[]> {
    if (!this.context) {
      throw new Error('OAuth2 plugin not installed');
    }

    try {
      const result = await this.context.client.req<OAuth2ProvidersResponse>(
        '/providers',
        undefined,
        { method: 'GET', skipAuth: true }
      );

      if (result.ok && result.data?.providers) {
        this.providers.clear();
        result.data.providers.forEach((provider) => {
          this.providers.set(provider.name, provider);
        });
        this.providersLoaded = true;
        return result.data.providers;
      }

      throw new Error(result.error?.message || 'Failed to load OAuth2 providers');
    } catch (error) {
      throw new Error(`Failed to load OAuth2 providers: ${error}`);
    }
  }

  /**
   * Get available OAuth2 providers
   */
  getProviders(): OAuth2Provider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Generate OAuth2 authorization URL
   */
  getAuthorizationUrl(options: OAuth2FlowOptions): string {
    const provider = this.providers.get(options.provider);
    if (!provider) {
      throw new Error(
        `OAuth2 provider "${options.provider}" not found. Call loadProviders() first.`
      );
    }

    const params = new URLSearchParams({
      client_id: provider.clientId,
      response_type: 'code',
      redirect_uri:
        options.redirectUri ||
        provider.redirectUri ||
        (typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : ''),
      scope: options.scope || provider.scope || '',
      state: options.state || this.generateState(),
      ...provider.additionalParams,
    });

    return `${provider.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Sign in with OAuth2 using popup window
   */
  async signInWithPopup<U extends User = User>(
    options: OAuth2FlowOptions
  ): Promise<ApiResponse<SignInData<U>>> {
    if (typeof window === 'undefined') {
      return {
        ok: false,
        data: null,
        error: {
          code: 'NOT_BROWSER',
          message: 'OAuth2 popup flow requires a browser environment',
        },
      };
    }

    // Ensure providers are loaded
    if (!this.providersLoaded) {
      try {
        await this.loadProviders();
      } catch (error) {
        return {
          ok: false,
          data: null,
          error: {
            code: 'PROVIDERS_LOAD_FAILED',
            message: `Failed to load OAuth2 providers: ${error}`,
          },
        };
      }
    }

    const authUrl = this.getAuthorizationUrl({ ...options, popup: true });
    const width = options.popupWidth || 500;
    const height = options.popupHeight || 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    // Open popup
    this.popupWindow = window.open(
      authUrl,
      'OAuth2 Sign In',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no`
    );

    if (!this.popupWindow) {
      return {
        ok: false,
        data: null,
        error: {
          code: 'POPUP_BLOCKED',
          message: 'Popup was blocked by the browser',
        },
      };
    }

    // Wait for callback
    return new Promise((resolve) => {
      let resolved = false;

      const messageHandler = async (event: MessageEvent) => {
        // Validate origin for security
        if (event.origin !== window.location.origin) {
          return;
        }

        const data = event.data;

        // Check for our specific message type or legacy format
        if (data.type !== 'oauth2_callback' && !data.code && !data.error) {
          return; // Not our message
        }

        if (resolved) {
          return;
        }

        if (data.error) {
          resolved = true;
          resolve({
            ok: false,
            data: null,
            error: {
              code: 'OAUTH2_ERROR',
              message: data.error_description || data.error,
            },
          });
          cleanup();
          return;
        }

        if (data.code) {
          resolved = true;
          // Exchange code for tokens via backend
          const result = await this.exchangeCode<U>(
            options.provider,
            data.code,
            options.redirectUri
          );
          resolve(result);
          cleanup();
        }
      };

      const cleanup = () => {
        window.removeEventListener('message', messageHandler);
        if (this.popupCheckInterval) {
          clearInterval(this.popupCheckInterval);
        }
        if (this.popupWindow && !this.popupWindow.closed) {
          this.popupWindow.close();
        }
      };

      // Listen for messages from popup
      window.addEventListener('message', messageHandler);

      // Check if popup was closed
      this.popupCheckInterval = window.setInterval(() => {
        if (this.popupWindow?.closed && !resolved) {
          resolved = true;
          resolve({
            ok: false,
            data: null,
            error: {
              code: 'POPUP_CLOSED',
              message: 'OAuth2 popup was closed by user',
            },
          });
          cleanup();
        }
      }, 500);
    });
  }

  /**
   * Sign in with OAuth2 using redirect flow
   */
  async signInWithRedirect(options: OAuth2FlowOptions): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('OAuth2 redirect flow requires a browser environment');
    }

    // Ensure providers are loaded
    if (!this.providersLoaded) {
      await this.loadProviders();
    }

    // Store state for validation after redirect
    const state = options.state || this.generateState();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('oauth2_state', state);
      localStorage.setItem('oauth2_provider', options.provider);
      if (options.redirectUri) {
        localStorage.setItem('oauth2_redirect_uri', options.redirectUri);
      }
    }

    const authUrl = this.getAuthorizationUrl({ ...options, state });
    window.location.href = authUrl;
  }

  /**
   * Handle OAuth2 callback (for both popup and redirect flows)
   */
  async handleCallback<U extends User = User>(
    searchParams?: URLSearchParams
  ): Promise<ApiResponse<SignInData<U>>> {
    if (typeof window === 'undefined') {
      return {
        ok: false,
        data: null,
        error: {
          code: 'NOT_BROWSER',
          message: 'OAuth2 callback handling requires a browser environment',
        },
      };
    }

    const params = searchParams || new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    // Check if we're in a popup
    if (window.opener) {
      // Send message to opener and close popup
      window.opener.postMessage(
        {
          code,
          state,
          error,
          error_description: errorDescription,
        },
        window.location.origin
      );
      window.close();
      return {
        ok: false,
        data: null,
        error: {
          code: 'POPUP_FLOW',
          message: 'Popup flow handled, closing window',
        },
      };
    }

    // Redirect flow
    if (error) {
      return {
        ok: false,
        data: null,
        error: {
          code: 'OAUTH2_ERROR',
          message: errorDescription || error,
        },
      };
    }

    if (!code) {
      return {
        ok: false,
        data: null,
        error: {
          code: 'NO_CODE',
          message: 'No authorization code found in callback',
        },
      };
    }

    // Validate state
    if (typeof localStorage !== 'undefined') {
      const savedState = localStorage.getItem('oauth2_state');
      if (savedState && savedState !== state) {
        return {
          ok: false,
          data: null,
          error: {
            code: 'STATE_MISMATCH',
            message: 'OAuth2 state mismatch, possible CSRF attack',
          },
        };
      }

      const provider = localStorage.getItem('oauth2_provider');
      if (!provider) {
        return {
          ok: false,
          data: null,
          error: {
            code: 'NO_PROVIDER',
            message: 'No OAuth2 provider found in storage',
          },
        };
      }

      const redirectUri = localStorage.getItem('oauth2_redirect_uri');

      // Clean up
      localStorage.removeItem('oauth2_state');
      localStorage.removeItem('oauth2_provider');
      localStorage.removeItem('oauth2_redirect_uri');

      // Exchange code for tokens via backend
      return this.exchangeCode<U>(provider, code, redirectUri || undefined);
    }

    return {
      ok: false,
      data: null,
      error: {
        code: 'NO_STORAGE',
        message: 'localStorage not available for state validation',
      },
    };
  }

  /**
   * Exchange authorization code for tokens via backend
   */
  private async exchangeCode<U extends User = User>(
    provider: string,
    code: string,
    redirectUri?: string
  ): Promise<ApiResponse<SignInData<U>>> {
    if (!this.context) {
      return {
        ok: false,
        data: null,
        error: {
          code: 'PLUGIN_NOT_INSTALLED',
          message: 'OAuth2 plugin not installed',
        },
      };
    }

    const payload: OAuth2SignInPayload = {
      provider,
      code,
      redirect_uri: redirectUri,
    };

    const result = await this.context.sdk.signIn('oauth2', payload);
    return result as ApiResponse<SignInData<U>>;
  }

  /**
   * Generate random state for CSRF protection
   */
  private generateState(): string {
    const array = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
}

/**
 * Create OAuth2 plugin instance
 */
export function createOAuth2Plugin(): OAuth2Plugin {
  return new OAuth2Plugin();
}
