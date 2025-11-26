import { describe, it, expect } from 'vitest'
import { serializeCookie, parseCookies, deleteCookie } from './cookies'

describe('serializeCookie', () => {
  it('should serialize basic cookie', () => {
    const cookie = serializeCookie('name', 'value')

    expect(cookie).toContain('name=value')
    expect(cookie).toContain('Path=/')
  })

  it('should include httpOnly flag', () => {
    const cookie = serializeCookie('name', 'value', { httpOnly: true })

    expect(cookie).toContain('HttpOnly')
  })

  it('should include secure flag', () => {
    const cookie = serializeCookie('name', 'value', { secure: true })

    expect(cookie).toContain('Secure')
  })

  it('should include sameSite attribute', () => {
    const cookie = serializeCookie('name', 'value', { sameSite: 'strict' })

    expect(cookie).toContain('SameSite=Strict')
  })

  it('should include maxAge', () => {
    const cookie = serializeCookie('name', 'value', { maxAge: 3600 })

    expect(cookie).toContain('Max-Age=3600')
  })

  it('should include domain', () => {
    const cookie = serializeCookie('name', 'value', { domain: 'example.com' })

    expect(cookie).toContain('Domain=example.com')
  })

  it('should include custom path', () => {
    const cookie = serializeCookie('name', 'value', { path: '/api' })

    expect(cookie).toContain('Path=/api')
  })

  it('should encode cookie value', () => {
    const cookie = serializeCookie('name', 'value with spaces')

    expect(cookie).toContain('name=value%20with%20spaces')
  })

  it('should handle all options together', () => {
    const cookie = serializeCookie('token', 'abc123', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7200,
      domain: 'example.com',
      path: '/auth',
    })

    expect(cookie).toContain('token=abc123')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Max-Age=7200')
    expect(cookie).toContain('Domain=example.com')
    expect(cookie).toContain('Path=/auth')
  })

  it('should handle sameSite none', () => {
    const cookie = serializeCookie('name', 'value', { sameSite: 'none' })

    expect(cookie).toContain('SameSite=None')
  })
})

describe('parseCookies', () => {
  it('should parse single cookie', () => {
    const cookies = parseCookies('name=value')

    expect(cookies).toEqual({ name: 'value' })
  })

  it('should parse multiple cookies', () => {
    const cookies = parseCookies('token=abc123; session=xyz789; user_id=42')

    expect(cookies).toEqual({
      token: 'abc123',
      session: 'xyz789',
      user_id: '42',
    })
  })

  it('should decode cookie values', () => {
    const cookies = parseCookies('name=value%20with%20spaces')

    expect(cookies).toEqual({ name: 'value with spaces' })
  })

  it('should handle empty string', () => {
    const cookies = parseCookies('')

    expect(cookies).toEqual({})
  })

  it('should handle null', () => {
    const cookies = parseCookies(null)

    expect(cookies).toEqual({})
  })

  it('should handle undefined', () => {
    const cookies = parseCookies(undefined)

    expect(cookies).toEqual({})
  })

  it('should handle cookies with = in value', () => {
    const cookies = parseCookies('token=abc=def=ghi')

    expect(cookies).toEqual({ token: 'abc=def=ghi' })
  })

  it('should handle whitespace', () => {
    const cookies = parseCookies('  name=value  ;  other=test  ')

    expect(cookies).toEqual({
      name: 'value',
      other: 'test',
    })
  })

  it('should skip invalid cookies', () => {
    const cookies = parseCookies('valid=value; invalid; another=test')

    expect(cookies).toEqual({
      valid: 'value',
      another: 'test',
    })
  })
})

describe('deleteCookie', () => {
  it('should create deletion cookie with Max-Age=0', () => {
    const cookie = deleteCookie('name')

    expect(cookie).toContain('name=')
    expect(cookie).toContain('Max-Age=0')
  })

  it('should include custom options', () => {
    const cookie = deleteCookie('name', {
      path: '/auth',
      domain: 'example.com',
    })

    expect(cookie).toContain('Path=/auth')
    expect(cookie).toContain('Domain=example.com')
    expect(cookie).toContain('Max-Age=0')
  })

  it('should include security flags', () => {
    const cookie = deleteCookie('name', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    })

    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Strict')
  })
})
