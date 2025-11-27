import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter,
  CookieStorageAdapter,
  createStorageAdapter,
} from './storage'

describe('MemoryStorageAdapter', () => {
  let storage: MemoryStorageAdapter

  beforeEach(() => {
    storage = new MemoryStorageAdapter()
  })

  it('should store and retrieve values', () => {
    storage.setItem('key', 'value')
    expect(storage.getItem('key')).toBe('value')
  })

  it('should return null for non-existent keys', () => {
    expect(storage.getItem('nonexistent')).toBeNull()
  })

  it('should remove items', () => {
    storage.setItem('key', 'value')
    storage.removeItem('key')
    expect(storage.getItem('key')).toBeNull()
  })

  it('should clear all items', () => {
    storage.setItem('key1', 'value1')
    storage.setItem('key2', 'value2')
    storage.clear()
    expect(storage.getItem('key1')).toBeNull()
    expect(storage.getItem('key2')).toBeNull()
  })

  it('should handle multiple keys', () => {
    storage.setItem('key1', 'value1')
    storage.setItem('key2', 'value2')
    storage.setItem('key3', 'value3')

    expect(storage.getItem('key1')).toBe('value1')
    expect(storage.getItem('key2')).toBe('value2')
    expect(storage.getItem('key3')).toBe('value3')
  })

  it('should overwrite existing values', () => {
    storage.setItem('key', 'value1')
    storage.setItem('key', 'value2')
    expect(storage.getItem('key')).toBe('value2')
  })
})

describe('createStorageAdapter', () => {
  it('should create an adapter when no storage is provided', () => {
    const adapter = createStorageAdapter()
    // In jsdom environment, it may return LocalStorageAdapter
    // In Node environment, it returns MemoryStorageAdapter
    expect(adapter).toBeDefined()
    expect(adapter.getItem).toBeDefined()
    expect(adapter.setItem).toBeDefined()
    expect(adapter.removeItem).toBeDefined()
  })

  it('should wrap Web Storage objects', () => {
    const mockStorage = {
      length: 0,
      getItem: (key: string) => 'test',
      setItem: (key: string, value: string) => {},
      removeItem: (key: string) => {},
      clear: () => {},
      key: (index: number) => null,
    }

    const adapter = createStorageAdapter(mockStorage as Storage)
    expect(adapter.getItem('test')).toBe('test')
  })

  it('should return StorageAdapter as-is if already correct interface', () => {
    const customAdapter = new MemoryStorageAdapter()
    const adapter = createStorageAdapter(customAdapter)
    expect(adapter).toBe(customAdapter)
  })
})

describe('LocalStorageAdapter', () => {
  it('should create instance without errors', () => {
    const adapter = new LocalStorageAdapter()
    expect(adapter).toBeDefined()
  })

  it('should handle missing window gracefully', () => {
    const adapter = new LocalStorageAdapter()
    // In Node environment, should return null
    const value = adapter.getItem('test')
    expect(value).toBeNull()
  })
})

describe('SessionStorageAdapter', () => {
  it('should create instance without errors', () => {
    const adapter = new SessionStorageAdapter()
    expect(adapter).toBeDefined()
  })

  it('should handle missing window gracefully', () => {
    const adapter = new SessionStorageAdapter()
    // In Node environment, should return null
    const value = adapter.getItem('test')
    expect(value).toBeNull()
  })
})

describe('CookieStorageAdapter', () => {
  let originalDocument: typeof document

  beforeEach(() => {
    // Mock document.cookie
    let cookieStore = ''
    Object.defineProperty(global, 'document', {
      value: {
        get cookie() {
          return cookieStore
        },
        set cookie(value: string) {
          // Parse the cookie being set
          const [cookiePair] = value.split(';')
          const [name, cookieValue] = cookiePair.split('=')

          // If max-age=0, remove the cookie
          if (value.includes('max-age=0')) {
            const cookies = cookieStore.split(';').filter(c => {
              const [cName] = c.trim().split('=')
              return cName !== name
            })
            cookieStore = cookies.join('; ')
          } else {
            // Add or update cookie
            const cookies = cookieStore.split(';').filter(c => {
              const [cName] = c.trim().split('=')
              return cName !== name && c.trim() !== ''
            })
            cookies.push(`${name}=${cookieValue}`)
            cookieStore = cookies.join('; ')
          }
        },
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    // Clean up mock
    vi.restoreAllMocks()
  })

  it('should create instance with default options', () => {
    const adapter = new CookieStorageAdapter()
    expect(adapter).toBeDefined()
  })

  it('should create instance with custom options', () => {
    const adapter = new CookieStorageAdapter({
      path: '/app',
      maxAge: 3600,
      secure: true,
      sameSite: 'strict',
    })
    expect(adapter).toBeDefined()
  })

  it('should store and retrieve values', () => {
    const adapter = new CookieStorageAdapter()
    adapter.setItem('auth_token', 'my-token-123')
    expect(adapter.getItem('auth_token')).toBe('my-token-123')
  })

  it('should return null for non-existent keys', () => {
    const adapter = new CookieStorageAdapter()
    expect(adapter.getItem('nonexistent')).toBeNull()
  })

  it('should remove items', () => {
    const adapter = new CookieStorageAdapter()
    adapter.setItem('auth_token', 'my-token-123')
    adapter.removeItem('auth_token')
    expect(adapter.getItem('auth_token')).toBeNull()
  })

  it('should handle URL-encoded values', () => {
    const adapter = new CookieStorageAdapter()
    const tokenWithSpecialChars = 'token=with+special&chars'
    adapter.setItem('auth_token', tokenWithSpecialChars)
    expect(adapter.getItem('auth_token')).toBe(tokenWithSpecialChars)
  })

  it('should handle multiple cookies', () => {
    const adapter = new CookieStorageAdapter()
    adapter.setItem('token1', 'value1')
    adapter.setItem('token2', 'value2')

    expect(adapter.getItem('token1')).toBe('value1')
    expect(adapter.getItem('token2')).toBe('value2')
  })

  it('should overwrite existing values', () => {
    const adapter = new CookieStorageAdapter()
    adapter.setItem('auth_token', 'old-token')
    adapter.setItem('auth_token', 'new-token')
    expect(adapter.getItem('auth_token')).toBe('new-token')
  })
})
