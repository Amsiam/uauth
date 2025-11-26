import type { StorageAdapter } from './types';

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
