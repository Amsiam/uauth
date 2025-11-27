/**
 * Shared API utilities
 * Low-level HTTP functions that can be used by both client and server
 */

import type { ApiResponse, AuthTokens, FetchFunction } from './types';

/**
 * Make a token refresh request to the auth backend
 * This is a low-level utility that just makes the HTTP call
 * Storage/cookie handling is the caller's responsibility
 *
 * @param baseURL - The base URL of the auth API
 * @param refreshToken - The refresh token to use
 * @param fetchFn - Optional custom fetch function
 * @returns API response with new tokens
 *
 * @example
 * ```typescript
 * const result = await refreshTokenRequest(
 *   'https://api.example.com/auth',
 *   'refresh_token_value'
 * )
 *
 * if (result.ok) {
 *   // Store new tokens
 *   console.log(result.data.tokens)
 * }
 * ```
 */
export async function refreshTokenRequest(
  baseURL: string,
  refreshToken: string,
  fetchFn: FetchFunction = fetch
): Promise<ApiResponse<{ tokens: AuthTokens }>> {
  if (!refreshToken) {
    return {
      ok: false,
      data: null,
      error: {
        code: 'NO_REFRESH_TOKEN',
        message: 'No refresh token provided',
      },
    };
  }

  try {
    const url = `${baseURL.replace(/\/$/, '')}/token/refresh`;

    const response = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const result: ApiResponse<{ tokens: AuthTokens }> = await response.json();
    return result;
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: {
        code: 'REFRESH_ERROR',
        message: error instanceof Error ? error.message : 'Token refresh failed',
      },
    };
  }
}
