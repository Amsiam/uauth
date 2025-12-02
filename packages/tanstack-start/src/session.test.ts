import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthSession } from './session'
import * as config from './config'

// Mock dependencies
vi.mock('@tanstack/react-start/server', () => ({
  useSession: vi.fn(),
}))

import { useSession } from '@tanstack/react-start/server'

describe('session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.spyOn(config, 'getConfig').mockReturnValue({
      baseURL: 'http://test-api.com',
      sessionSecret: 'test-secret',
      cookies: {
        path: '/app',
        maxAge: 3600,
        secure: true,
        sameSite: 'strict',
      },
    })
  })

  describe('useAuthSession', () => {
    it('should configure session with correct options', () => {
      useAuthSession()
      
      expect(useSession).toHaveBeenCalledWith({
        name: 'uauth-session',
        password: 'test-secret',
        cookie: {
          secure: true,
          sameSite: 'strict',
          httpOnly: true,
          path: '/app',
          maxAge: 3600,
        },
      })
    })

    it('should use default cookie options if not configured', () => {
      vi.spyOn(config, 'getConfig').mockReturnValue({
        baseURL: 'http://test-api.com',
        sessionSecret: 'test-secret',
        // @ts-ignore - partial config
        cookies: undefined,
      })

      useAuthSession()
      
      expect(useSession).toHaveBeenCalledWith(expect.objectContaining({
        cookie: expect.objectContaining({
          path: '/',
          maxAge: 604800,
          secure: true, // Default from code
          sameSite: 'lax',
        }),
      }))
    })
  })
})
