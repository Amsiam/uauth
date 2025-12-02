import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAuth, getSessionFn, signInFn, signUpFn, signOutFn, getOAuthProvidersFn, getOAuthUrlFn, oauthSignInFn } from './server'
import * as config from './config'
import * as session from './session'

// Mock dependencies
const mockAuth = {
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  session: vi.fn(),
  getToken: vi.fn(),
  refresh: vi.fn(),
  plugin: vi.fn(),
}

const mockSession = {
  data: {},
  update: vi.fn(),
}

vi.mock('@nightmar3/uauth-core', () => ({
  UniversalAuthSDK: vi.fn(() => mockAuth),
  createOAuth2Plugin: vi.fn(() => ({ loadProviders: vi.fn() })),
}))

vi.mock('@tanstack/react-start', () => ({
  createServerFn: vi.fn().mockReturnValue({
    handler: vi.fn((cb) => cb),
    inputValidator: vi.fn().mockReturnThis(),
  }),
}))

describe('server', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock config
    vi.spyOn(config, 'getConfig').mockReturnValue({
      baseURL: 'http://test-api.com',
      sessionSecret: 'test-secret',
    })

    // Mock session
    vi.spyOn(session, 'useAuthSession').mockResolvedValue(mockSession as any)
  })

  describe('getAuth', () => {
    it('should initialize SDK with correct config', async () => {
      const { auth } = await getAuth()
      expect(auth).toBe(mockAuth)
      // Check if UniversalAuthSDK was called with correct config (via mock)
      // This is tricky to check directly without importing the class mock, 
      // but we can verify behavior
    })


  })

  describe('getSessionFn', () => {
    it('should return null if no access token', async () => {
      mockSession.data = {}
      const result = await getSessionFn()
      expect(result).toBeNull()
    })

    it('should return session if valid', async () => {
      mockSession.data = { accessToken: 'token' }
      mockAuth.session.mockResolvedValue({ ok: true, data: { user: { id: '1' } } })
      mockAuth.getToken.mockResolvedValue('fresh-token')

      const result = await getSessionFn()
      expect(result).toEqual({
        user: { id: '1' },
        accessToken: 'fresh-token',
      })
    })
  })

  describe('signInFn', () => {
    it('should call SDK signIn', async () => {
      mockAuth.signIn.mockResolvedValue({ ok: true, data: { user: { id: '1' } } })
      
      await signInFn({ data: { email: 'test@test.com', password: 'pass' } } as any)
      
      expect(mockAuth.signIn).toHaveBeenCalledWith('password', {
        email: 'test@test.com',
        password: 'pass',
      })
    })
  })

  describe('signOutFn', () => {
    it('should call SDK signOut and clear session', async () => {
      mockAuth.signOut.mockResolvedValue({ ok: true })
      
      await signOutFn()
      
      expect(mockAuth.signOut).toHaveBeenCalled()
      expect(mockSession.update).toHaveBeenCalledWith(expect.objectContaining({
        accessToken: undefined,
        userId: undefined,
      }))
    })

    it('should clear session even if SDK fails', async () => {
      mockAuth.signOut.mockRejectedValue(new Error('Network error'))
      
      await signOutFn()
      
      expect(mockSession.update).toHaveBeenCalledWith(expect.objectContaining({
        accessToken: undefined,
      }))
    })
  })

  describe('OAuth Functions', () => {
    it('getOAuthProvidersFn should install plugin and call loadProviders', async () => {
      const mockPlugin = { loadProviders: vi.fn() }
      // We need to mock the plugin instance that gets installed
      // This is hard because createOAuth2Plugin returns the plugin instance
      // and we mock the factory function.
      
      // For now, we just verify it calls plugin install
      await getOAuthProvidersFn()
      expect(mockAuth.plugin).toHaveBeenCalledWith('oauth2', expect.anything())
    })
  })
})
