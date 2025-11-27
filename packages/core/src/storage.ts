import type { StorageAdapter } from './types';

/**
 * Cookie storage options
 */
export interface CookieStorageOptions {
  /** Cookie path (default: '/') */
  path?: string;
  /** Cookie domain */
  domain?: string;
  /** Cookie max age in seconds (default: 7 days) */
  maxAge?: number;
  /** Use secure flag (default: true in production) */
  secure?: boolean;
  /** SameSite attribute (default: 'lax') */
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Cookie storage adapter - stores tokens in browser cookies
 * This enables server-side components to read auth tokens
 */
export class CookieStorageAdapter implements StorageAdapter {
  private options: Required<CookieStorageOptions>;

  constructor(options: CookieStorageOptions = {}) {
    this.options = {
      path: options.path ?? '/',
      domain: options.domain ?? '',
      maxAge: options.maxAge ?? 7 * 24 * 60 * 60, // 7 days
      secure: options.secure ?? (typeof window !== 'undefined' && window.location.protocol === 'https:'),
      sameSite: options.sameSite ?? 'lax',
    };
  }

  getItem(key: string): string | null {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (name === key) {
        return decodeURIComponent(valueParts.join('='));
      }
    }
    return null;
  }

  setItem(key: string, value: string): void {
    if (typeof document === 'undefined') return;

    const { path, domain, maxAge, secure, sameSite } = this.options;

    let cookieString = `${key}=${encodeURIComponent(value)}`;
    cookieString += `; path=${path}`;
    cookieString += `; max-age=${maxAge}`;
    cookieString += `; samesite=${sameSite}`;

    if (domain) {
      cookieString += `; domain=${domain}`;
    }

    if (secure) {
      cookieString += '; secure';
    }

    document.cookie = cookieString;
  }

  removeItem(key: string): void {
    if (typeof document === 'undefined') return;

    const { path, domain } = this.options;

    let cookieString = `${key}=; path=${path}; max-age=0`;

    if (domain) {
      cookieString += `; domain=${domain}`;
    }

    document.cookie = cookieString;
  }
}

/**
 * Wrapper for localStorage that matches StorageAdapter interface
 */
export class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
}

/**
 * Wrapper for sessionStorage that matches StorageAdapter interface
 */
export class SessionStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(key);
  }
}

/**
 * In-memory storage adapter (useful for testing or server-side)
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private storage: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.storage.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

/**
 * Create a storage adapter from various input types
 */
export function createStorageAdapter(
  storage?: StorageAdapter | Storage
): StorageAdapter {
  if (!storage) {
    // Default to localStorage if available, otherwise memory
    if (typeof window !== 'undefined' && window.localStorage) {
      return new LocalStorageAdapter();
    }
    return new MemoryStorageAdapter();
  }

  // If it's already a StorageAdapter, return it
  if ('getItem' in storage && 'setItem' in storage && 'removeItem' in storage) {
    // Check if it's a Web Storage (has length and other properties)
    if ('length' in storage) {
      // It's a Web Storage object, wrap it
      return {
        getItem: (key: string) => storage.getItem(key),
        setItem: (key: string, value: string) => storage.setItem(key, value),
        removeItem: (key: string) => storage.removeItem(key),
      };
    }
    return storage as StorageAdapter;
  }

  return new MemoryStorageAdapter();
}
