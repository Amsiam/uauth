/**
 * Universal Auth SDK - TanStack Start Server Functions
 *
 * All server functions that handle authentication operations.
 * These wrap the core package and integrate with TanStack Start's session management.
 */

import { createServerFn } from '@tanstack/react-start'
import { UniversalAuthSDK, type StorageAdapter, type User, createOAuth2Plugin, type OAuth2Provider } from '@nightmar3/uauth-core'
import { useAuthSession } from './session'
import { getConfig } from './config'
import type { Session } from './types'

/**
 * Storage adapter that maps core SDK storage calls to TanStack Start session
 * Implements read-your-writes consistency with a local cache
 */
class TanStackSessionAdapter implements StorageAdapter {
  private cache: Record<string, string> = {}

  constructor(private session: any) {}

  async getItem(key: string): Promise<string | null> {
    // Check cache first
    if (key in this.cache) {
      return this.cache[key] ?? null
    }

    const data = this.session.data
    if (key.endsWith('access_token')) return data.accessToken ?? null
    if (key.endsWith('refresh_token')) return data.refreshToken ?? null
    if (key.endsWith('expires_at')) return data.expiresAt?.toString() ?? null
    return null
  }

  async setItem(key: string, value: string): Promise<void> {
    // Update cache
    this.cache[key] = value

    // We need to get fresh data as multiple setItem calls might happen
    const data = { ...this.session.data }
    
    if (key.endsWith('access_token')) data.accessToken = value
    else if (key.endsWith('refresh_token')) data.refreshToken = value
    else if (key.endsWith('expires_at')) data.expiresAt = parseInt(value, 10)
    
    await this.session.update(data)
  }

  async removeItem(key: string): Promise<void> {
    // Update cache
    delete this.cache[key]

    const data = { ...this.session.data }
    
    if (key.endsWith('access_token')) delete data.accessToken
    else if (key.endsWith('refresh_token')) delete data.refreshToken
    else if (key.endsWith('expires_at')) delete data.expiresAt
    
    await this.session.update(data)
  }
}

/**
 * Helper to create an auth instance scoped to the current request session
 */
export async function getAuth() {
  const config = getConfig()
  const session = await useAuthSession()
  
  const auth = new UniversalAuthSDK({
    baseURL: config.baseURL,
    storage: new TanStackSessionAdapter(session),
    // Use global fetch which works in Node 18+ and edge runtimes
    fetch: globalThis.fetch,
  })

  // Only install OAuth2 plugin if explicitly requested
  // This prevents auto-load errors when OAuth isn't configured
  // The plugin will be installed on-demand by OAuth-specific functions

  return { auth, session }
}

/**
 * Sign in with email and password
 */
export const signInFn = createServerFn({ method: 'POST' })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const { auth } = await getAuth()
    return auth.signIn('password', data)
  })

/**
 * Sign up with email and password
 */
export const signUpFn = createServerFn({ method: 'POST' })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const { auth } = await getAuth()
    return auth.signUp(data)
  })

/**
 * Sign out
 */
/**
 * Sign out
 */
export const signOutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { auth, session } = await getAuth()
  
  try {
    await auth.signOut()
  } catch (e) {
    console.error('Backend sign out failed:', e)
  }

  // Force clear session data
  await session.update({
    userId: undefined,
    email: undefined,
    accessToken: undefined,
    refreshToken: undefined,
    expiresAt: undefined
  })
})

/**
 * Get current session
 * Auto-refreshes tokens if needed via core SDK
 */
export const getSessionFn = createServerFn({ method: 'GET' }).handler(async (): Promise<Session | null> => {
  const { auth, session } = await getAuth()
  
  // Check if we have tokens locally first to avoid unnecessary network calls
  const accessToken = session.data.accessToken
  if (!accessToken) return null

  // auth.session() will automatically handle token refresh if needed
  const result = await auth.session()

  if (result.ok && result.data?.user) {
    // Get the potentially refreshed token from auth instance
    const freshAccessToken = await auth.getToken()
    
    return {
      user: result.data.user,
      accessToken: freshAccessToken || accessToken,
    }
  }

  return null
})

/**
 * Get current user
 */
export const getUserFn = createServerFn({ method: 'GET' }).handler(async (): Promise<User | null> => {
  const session = await getSessionFn()
  return session?.user ?? null
})

/**
 * Refresh access token manually
 */
export const refreshTokenFn = createServerFn({ method: 'POST' }).handler(async () => {
  const { auth } = await getAuth()
  return auth.refresh()
})

/**
 * Get OAuth providers (proxied via server)
 */
export const getOAuthProvidersFn = createServerFn({ method: 'GET' }).handler(async (): Promise<OAuth2Provider[]> => {
  const { auth } = await getAuth()
  
  // Install OAuth plugin on-demand
  await auth.plugin('oauth2', createOAuth2Plugin())
  
  const plugin = (auth as any).oauth2
  if (!plugin) return []
  
  try {
    return await plugin.loadProviders()
  } catch (error) {
    console.warn('Failed to load OAuth providers:', error)
    return []
  }
})

/**
 * Get OAuth authorization URL (proxied via server)
 */
export const getOAuthUrlFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { provider: string; redirectUri?: string }) => data)
  .handler(async ({ data }) => {
    const { auth } = await getAuth()
    
    // Install OAuth plugin on-demand
    await auth.plugin('oauth2', createOAuth2Plugin())
    
    const plugin = (auth as any).oauth2
    if (!plugin) throw new Error('OAuth plugin not active')
    
    return plugin.getAuthorizationUrl({
      provider: data.provider,
      redirectUri: data.redirectUri,
    })
  })

/**
 * Sign in with OAuth code (proxied via server)
 * Exchanges code for tokens and sets session cookie
 */
export const oauthSignInFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { provider: string; code: string; redirectUri?: string }) => data)
  .handler(async ({ data }) => {
    const { auth } = await getAuth()
    
    // Install OAuth plugin on-demand
    await auth.plugin('oauth2', createOAuth2Plugin())
    
    // This will exchange the code and automatically set tokens via the storage adapter
    return auth.signIn('oauth2', {
      provider: data.provider,
      code: data.code,
      redirect_uri: data.redirectUri,
    })
  })

