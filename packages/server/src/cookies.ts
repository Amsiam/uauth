/**
 * Cookie utilities for server-side authentication
 */

export interface CookieOptions {
  name?: string;
  domain?: string;
  path?: string;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  name: 'auth_token',
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

/**
 * Serialize a cookie with options
 */
export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): string {
  const opts = { ...DEFAULT_COOKIE_OPTIONS, ...options };
  const parts: string[] = [`${name}=${encodeURIComponent(value)}`];

  if (opts.maxAge !== undefined) {
    parts.push(`Max-Age=${opts.maxAge}`);
  }

  if (opts.domain) {
    parts.push(`Domain=${opts.domain}`);
  }

  if (opts.path) {
    parts.push(`Path=${opts.path}`);
  }

  if (opts.httpOnly) {
    parts.push('HttpOnly');
  }

  if (opts.secure) {
    parts.push('Secure');
  }

  if (opts.sameSite) {
    parts.push(`SameSite=${opts.sameSite.charAt(0).toUpperCase() + opts.sameSite.slice(1)}`);
  }

  return parts.join('; ');
}

/**
 * Parse cookies from a Cookie header string
 */
export function parseCookies(cookieHeader: string | null | undefined): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie)
    .reduce((acc, cookie) => {
      const [name, ...rest] = cookie.split('=');
      const value = rest.join('=');
      if (name && value) {
        acc[name] = decodeURIComponent(value);
      }
      return acc;
    }, {} as Record<string, string>);
}

/**
 * Create a cookie deletion string
 */
export function deleteCookie(name: string, options: Omit<CookieOptions, 'maxAge'> = {}): string {
  return serializeCookie(name, '', { ...options, maxAge: 0 });
}
