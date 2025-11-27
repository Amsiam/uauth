import {
  refreshTokenRequest,
  type AuthConfig,
  type ApiResponse,
  type SessionData,
  type User,
  type AuthTokens,
} from '@nightmar3/uauth-core';
import { parseCookies } from './cookies';

export interface ServerAuthConfig extends Omit<AuthConfig, 'storage'> {
  cookieName?: string;
  refreshTokenCookieName?: string;
}

/**
 * Callback to set new tokens after refresh
 * Used by getSession to update cookies/storage when tokens are refreshed
 */
export type OnTokenRefreshCallback = (tokens: AuthTokens) => void | Promise<void>;

export class ServerAuth<U extends User = User> {
  private baseURL: string;
  private cookieName: string;
  private refreshTokenCookieName: string;
  private fetchFn: typeof fetch;

  constructor(config: ServerAuthConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, '');
    this.cookieName = config.cookieName || 'auth_token';
    this.refreshTokenCookieName = config.refreshTokenCookieName || 'refresh_token';
    this.fetchFn = config.fetch || fetch;
  }

  /**
   * Get session from cookie header
   * If onTokenRefresh callback is provided, will auto-refresh on 401 and call the callback with new tokens
   *
   * @param cookieHeader - The cookie header string
   * @param onTokenRefresh - Optional callback called when tokens are refreshed (to set new cookies)
   */
  async getSession(
    cookieHeader: string | null,
    onTokenRefresh?: OnTokenRefreshCallback
  ): Promise<ApiResponse<SessionData<U>>> {
    if (!cookieHeader) {
      return {
        ok: false,
        data: null,
        error: {
          code: 'NO_TOKEN',
          message: 'No authentication cookie found',
        },
      };
    }

    const cookies = parseCookies(cookieHeader);
    const token = cookies[this.cookieName];

    if (!token) {
      return {
        ok: false,
        data: null,
        error: {
          code: 'NO_TOKEN',
          message: 'No authentication token in cookies',
        },
      };
    }

    try {
      const response = await this.fetchFn(`${this.baseURL}/session`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result: ApiResponse<SessionData<U>> = await response.json();

      // Auto-refresh on 401 if callback provided
      if (!result.ok && result.error?.code === 'UNAUTHORIZED' && onTokenRefresh) {
        const refreshToken = cookies[this.refreshTokenCookieName];

        if (refreshToken) {
          const refreshResult = await this.refreshToken(refreshToken);

          if (refreshResult.ok && refreshResult.data?.tokens) {
            // Call the callback with new tokens
            await onTokenRefresh(refreshResult.data.tokens);

            // Retry with new access token
            const retryResponse = await this.fetchFn(`${this.baseURL}/session`, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${refreshResult.data.tokens.access_token}`,
                'Content-Type': 'application/json',
              },
            });

            return retryResponse.json();
          }
        }
      }

      return result;
    } catch (error) {
      return {
        ok: false,
        data: null,
        error: {
          code: 'SESSION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get session',
        },
      };
    }
  }

  /**
   * Get session from Request object (works with Next.js, Vercel, etc.)
   *
   * @param request - The Request object
   * @param onTokenRefresh - Optional callback called when tokens are refreshed
   */
  async getSessionFromRequest(
    request: Request,
    onTokenRefresh?: OnTokenRefreshCallback
  ): Promise<ApiResponse<SessionData<U>>> {
    const cookieHeader = request.headers.get('cookie');
    return this.getSession(cookieHeader, onTokenRefresh);
  }

  /**
   * Verify token and return user
   */
  async verifyToken(token: string): Promise<ApiResponse<SessionData<U>>> {
    try {
      const response = await this.fetchFn(`${this.baseURL}/session`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result: ApiResponse<SessionData<U>> = await response.json();
      return result;
    } catch (error) {
      return {
        ok: false,
        data: null,
        error: {
          code: 'VERIFY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to verify token',
        },
      };
    }
  }

  /**
   * Refresh access token using refresh token
   * Returns new tokens that should be stored in cookies
   */
  async refreshToken(refreshTokenValue: string): Promise<ApiResponse<{ tokens: AuthTokens }>> {
    // Use shared refresh utility from @uauth/core
    return refreshTokenRequest(this.baseURL, refreshTokenValue, this.fetchFn);
  }

  /**
   * Refresh token from cookie header
   * Returns new tokens if refresh was successful
   */
  async refreshFromCookies(
    cookieHeader: string | null,
    refreshTokenCookieName?: string
  ): Promise<ApiResponse<{ tokens: AuthTokens }>> {
    if (!cookieHeader) {
      return {
        ok: false,
        data: null,
        error: {
          code: 'NO_COOKIES',
          message: 'No cookies provided',
        },
      };
    }

    const cookies = parseCookies(cookieHeader);
    const refreshCookieName = refreshTokenCookieName || this.cookieName.replace('access_token', 'refresh_token');
    const refreshToken = cookies[refreshCookieName];

    return this.refreshToken(refreshToken);
  }
}

/**
 * Create a server-side auth client
 *
 * @throws Error if used in a browser environment
 */
export function createServerAuth<U extends User = User>(
  config: ServerAuthConfig
): ServerAuth<U> {
  // Error if used in browser
  if (typeof window !== 'undefined') {
    throw new Error(
      '[@nightmar3/uauth-server] createServerAuth() is for server-side use only. ' +
      'For client-side authentication, use createAuth() from "@nightmar3/uauth-core" instead.'
    );
  }
  return new ServerAuth<U>(config);
}
