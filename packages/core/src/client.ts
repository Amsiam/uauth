import type {
  ApiResponse,
  AuthConfig,
  AuthTokens,
  RequestOptions,
  FetchFunction,
  StorageAdapter,
} from './types';
import { createStorageAdapter } from './storage';
import { refreshTokenRequest } from './api';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  EXPIRES_AT: 'expires_at',
};

export class ApiClient {
  private baseURL: string;
  private storage: StorageAdapter;
  private fetch: FetchFunction;
  private storageKeyPrefix: string;
  private onTokenRefresh?: (tokens: AuthTokens) => void;
  private onAuthError?: (error: any) => void;
  private refreshPromise: Promise<ApiResponse<any>> | null = null;

  constructor(config: AuthConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.storage = createStorageAdapter(config.storage);
    this.fetch = config.fetch || (globalThis.fetch?.bind(globalThis));
    this.storageKeyPrefix = config.storageKeyPrefix || 'universal_auth_';
    this.onTokenRefresh = config.onTokenRefresh;
    this.onAuthError = config.onAuthError;

    if (!this.fetch) {
      throw new Error(
        'Fetch is not available. Please provide a fetch implementation in the config.'
      );
    }
  }

  /**
   * Get storage key with prefix
   */
  private getStorageKey(key: string): string {
    return `${this.storageKeyPrefix}${key}`;
  }

  /**
   * Get access token from storage
   */
  async getAccessToken(): Promise<string | null> {
    const token = await this.storage.getItem(
      this.getStorageKey(STORAGE_KEYS.ACCESS_TOKEN)
    );
    return token;
  }

  /**
   * Get refresh token from storage
   */
  async getRefreshToken(): Promise<string | null> {
    const token = await this.storage.getItem(
      this.getStorageKey(STORAGE_KEYS.REFRESH_TOKEN)
    );
    return token;
  }

  /**
   * Check if access token is expired
   */
  async isTokenExpired(): Promise<boolean> {
    const expiresAt = await this.storage.getItem(
      this.getStorageKey(STORAGE_KEYS.EXPIRES_AT)
    );
    if (!expiresAt) return true;

    const expiryTime = parseInt(expiresAt, 10);
    const now = Date.now();
    // Consider expired if within 30 seconds of expiry
    return now >= expiryTime - 30000;
  }

  /**
   * Get token expiry timestamp (milliseconds since epoch)
   * Returns null if no token or expiry info stored
   */
  async getTokenExpiresAt(): Promise<number | null> {
    const expiresAt = await this.storage.getItem(
      this.getStorageKey(STORAGE_KEYS.EXPIRES_AT)
    );
    if (!expiresAt) return null;
    return parseInt(expiresAt, 10);
  }

  /**
   * Store authentication tokens
   */
  async setTokens(tokens: AuthTokens): Promise<void> {
    await this.storage.setItem(
      this.getStorageKey(STORAGE_KEYS.ACCESS_TOKEN),
      tokens.access_token
    );
    await this.storage.setItem(
      this.getStorageKey(STORAGE_KEYS.REFRESH_TOKEN),
      tokens.refresh_token
    );

    // Calculate expiry timestamp
    const expiresAt = Date.now() + tokens.expires_in * 1000;
    await this.storage.setItem(
      this.getStorageKey(STORAGE_KEYS.EXPIRES_AT),
      expiresAt.toString()
    );

    if (this.onTokenRefresh) {
      this.onTokenRefresh(tokens);
    }
  }

  /**
   * Clear all authentication tokens
   */
  async clearTokens(): Promise<void> {
    await this.storage.removeItem(this.getStorageKey(STORAGE_KEYS.ACCESS_TOKEN));
    await this.storage.removeItem(this.getStorageKey(STORAGE_KEYS.REFRESH_TOKEN));
    await this.storage.removeItem(this.getStorageKey(STORAGE_KEYS.EXPIRES_AT));
  }

  /**
   * Refresh access token
   */
  async refresh(): Promise<ApiResponse<{ tokens: AuthTokens }>> {
    // If a refresh is already in progress, return that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await this.getRefreshToken();

        if (!refreshToken) {
          return {
            ok: false,
            data: null,
            error: {
              code: 'NO_REFRESH_TOKEN',
              message: 'No refresh token available',
            },
          };
        }

        // Use shared refresh utility
        const result = await refreshTokenRequest(this.baseURL, refreshToken, this.fetch);

        if (result.ok && result.data?.tokens) {
          await this.setTokens(result.data.tokens);
        } else if (!result.ok && this.onAuthError && result.error) {
          this.onAuthError(result.error);
        }

        return result;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Make an authenticated API request
   */
  async req<T = any>(
    path: string,
    body?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = body ? 'POST' : 'GET',
      headers = {},
      skipAuth = false,
      skipRefresh = false,
    } = options;

    // Build request headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Add authorization header if not skipped
    if (!skipAuth) {
      const token = await this.getAccessToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    // Make the request
    const url = path.startsWith('http') ? path : `${this.baseURL}${path}`;

    try {
      const response = await this.fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const result: ApiResponse<T> = await response.json();

      // Handle 401 with automatic token refresh
      if (
        !result.ok &&
        result.error?.code === 'UNAUTHORIZED' &&
        !skipRefresh &&
        !skipAuth
      ) {
        const refreshResult = await this.refresh();

        if (refreshResult.ok) {
          // Retry the original request with new token
          return this.req<T>(path, body, { ...options, skipRefresh: true });
        } else {
          // Refresh failed, clear tokens
          await this.clearTokens();
          if (this.onAuthError && refreshResult.error) {
            this.onAuthError(refreshResult.error);
          }
        }
      }

      return result;
    } catch (error) {
      return {
        ok: false,
        data: null,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
        },
      };
    }
  }
}
