import type {
  AuthConfig,
  ApiResponse,
  SessionData,
  User,
  AuthTokens,
} from '@uauth/core';
import { parseCookies } from './cookies';

export interface ServerAuthConfig extends Omit<AuthConfig, 'storage'> {
  cookieName?: string;
}

export class ServerAuth<U extends User = User> {
  private baseURL: string;
  private cookieName: string;
  private fetchFn: typeof fetch;

  constructor(config: ServerAuthConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, '');
    this.cookieName = config.cookieName || 'auth_token';
    this.fetchFn = config.fetch || fetch;
  }

  /**
   * Get session from cookie header
   */
  async getSession(cookieHeader: string | null): Promise<ApiResponse<SessionData<U>>> {
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
   */
  async getSessionFromRequest(request: Request): Promise<ApiResponse<SessionData<U>>> {
    const cookieHeader = request.headers.get('cookie');
    return this.getSession(cookieHeader);
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
      '[@uauth/server] createServerAuth() is for server-side use only. ' +
      'For client-side authentication, use createAuth() from "@uauth/core" instead.'
    );
  }
  return new ServerAuth<U>(config);
}
