import type { AuthTokens, User } from '@nightmar3/uauth-core'
import { createServerAuth } from '@nightmar3/uauth-server'
import { COOKIE_NAMES, getConfig, getCookieName } from './config'
import type { ServerAuthContext, Session } from './types'

// ============================================================================
// Server Auth Instance
// ============================================================================

let serverAuthInstance: ReturnType<typeof createServerAuth> | null = null

/**
 * Get or create the server auth instance
 */
function getServerAuthInstance() {
  if (!serverAuthInstance) {
    const config = getConfig()

    serverAuthInstance = createServerAuth({
      baseURL: config.baseURL || process.env.AUTH_URL || '',
      cookieName: getCookieName(COOKIE_NAMES.ACCESS_TOKEN),
      refreshTokenCookieName: getCookieName(COOKIE_NAMES.REFRESH_TOKEN),
    })
  }

  return serverAuthInstance
}

/**
 * Helper to get cookies from TanStack Start server function context
 * TanStack Start uses Web APIs, so we can use the Request headers
 */
function getCookieHeader(request?: Request): string {
  if (!request) {
    // Fallback: try to get from global context if available
    return ''
  }
  return request.headers.get('cookie') || ''
}

/**
 * Helper to set cookies in TanStack Start server function response
 */
export function createSetCookieHeaders(tokens: AuthTokens): string[] {
  const config = getConfig()
  const headers: string[] = []

  // Set access token cookie
  const accessTokenCookie = [
    `${getCookieName(COOKIE_NAMES.ACCESS_TOKEN)}=${tokens.access_token}`,
    `Path=${config.cookies.path}`,
    `Max-Age=${tokens.expires_in}`,
    config.cookies.secure ? 'Secure' : '',
    `SameSite=${config.cookies.sameSite}`,
    'HttpOnly',
  ].filter(Boolean).join('; ')
  headers.push(accessTokenCookie)

  // Set refresh token cookie
  const refreshTokenCookie = [
    `${getCookieName(COOKIE_NAMES.REFRESH_TOKEN)}=${tokens.refresh_token}`,
    `Path=${config.cookies.path}`,
    `Max-Age=${config.cookies.maxAge}`,
    config.cookies.secure ? 'Secure' : '',
    `SameSite=${config.cookies.sameSite}`,
    'HttpOnly',
  ].filter(Boolean).join('; ')
  headers.push(refreshTokenCookie)

  return headers
}

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Get the current session in TanStack Start server functions
 * Automatically refreshes tokens if they are expired (401 response)
 *
 * @example
 * ```tsx
 * // app/routes/dashboard.tsx
 * import { createFileRoute } from '@tanstack/react-router'
 * import { getSession } from '@uauth/start/server'
 *
 * export const Route = createFileRoute('/dashboard')({
 *   loader: async ({ context }) => {
 *     const session = await getSession(context.request)
 *     if (!session) {
 *       throw redirect({ to: '/login' })
 *     }
 *     return { user: session.user }
 *   }
 * })
 * ```
 */
export async function getSession<U = User>(request?: Request): Promise<Session<U> | null> {
  const serverAuth = getServerAuthInstance()
  const cookieHeader = getCookieHeader(request)

  // Create callback to set new cookies if tokens are refreshed
  const onTokenRefresh = async (tokens: AuthTokens) => {
    // Note: In TanStack Start, you'll need to handle setting cookies in the response
    // This is typically done by returning headers from your loader/action
    // The callback here is for compatibility but may need adjustment based on your setup
    console.warn('[@uauth/start] Token refresh occurred. You may need to manually set cookies in your response.')
  }

  // Get session with auto-refresh on 401
  const result = await serverAuth.getSession(cookieHeader, onTokenRefresh)

  if (!result.ok || !result.data) {
    return null
  }

  // Extract access token from cookie header
  const accessToken = cookieHeader
    .split(';')
    .find((c) => c.trim().startsWith(`${getCookieName(COOKIE_NAMES.ACCESS_TOKEN)}=`))
    ?.split('=')[1] || ''

  return {
    user: result.data.user as U,
    accessToken,
  }
}

/**
 * Get the current user in TanStack Start server functions
 * Returns null if not authenticated
 *
 * @example
 * ```tsx
 * // app/routes/profile.tsx
 * import { getUser } from '@uauth/start/server'
 *
 * export const Route = createFileRoute('/profile')({
 *   loader: async ({ context }) => {
 *     const user = await getUser(context.request)
 *     return { user }
 *   }
 * })
 * ```
 */
export async function getUser<U = User>(request?: Request): Promise<U | null> {
  const session = await getSession<U>(request)
  return session?.user ?? null
}

/**
 * Get auth context for lightweight checks
 * Returns userId and sessionToken if authenticated
 *
 * @example
 * ```tsx
 * // app/routes/api/protected.ts
 * import { auth } from '@uauth/start/server'
 *
 * export async function loader({ request }: { request: Request }) {
 *   const { userId } = await auth(request)
 *
 *   if (!userId) {
 *     return new Response('Unauthorized', { status: 401 })
 *   }
 *
 *   return { userId }
 * }
 * ```
 */
export async function auth(request?: Request): Promise<ServerAuthContext> {
  const cookieHeader = getCookieHeader(request)
  const accessToken = cookieHeader
    .split(';')
    .find((c) => c.trim().startsWith(`${getCookieName(COOKIE_NAMES.ACCESS_TOKEN)}=`))
    ?.split('=')[1]

  if (!accessToken) {
    return { userId: null, sessionToken: null }
  }

  // Try to get full session
  const session = await getSession(request)

  return {
    userId: session?.user?.id ?? null,
    sessionToken: accessToken,
  }
}

/**
 * Check if the current request is authenticated
 *
 * @example
 * ```tsx
 * // app/routes/api/protected.ts
 * import { isAuthenticated } from '@uauth/start/server'
 *
 * export async function loader({ request }: { request: Request }) {
 *   if (!(await isAuthenticated(request))) {
 *     return new Response('Unauthorized', { status: 401 })
 *   }
 *   // ... handle request
 * }
 * ```
 */
export async function isAuthenticated(request?: Request): Promise<boolean> {
  const { userId } = await auth(request)
  return userId !== null
}

/**
 * Protect a server function - throws if not authenticated
 *
 * @example
 * ```tsx
 * // app/routes/api/protected.ts
 * import { protect } from '@uauth/start/server'
 *
 * export async function loader({ request }: { request: Request }) {
 *   const { userId } = await protect(request)
 *   return { userId }
 * }
 * ```
 */
export async function protect(request?: Request): Promise<ServerAuthContext & { userId: string; sessionToken: string }> {
  const context = await auth(request)

  if (!context.userId || !context.sessionToken) {
    throw new Error('Unauthorized')
  }

  return context as ServerAuthContext & { userId: string; sessionToken: string }
}

// ============================================================================
// Token Refresh
// ============================================================================

/**
 * Refresh the access token using the refresh token from cookies
 * Returns new tokens and Set-Cookie headers
 *
 * @example
 * ```tsx
 * // app/routes/api/refresh.ts
 * import { refreshToken } from '@uauth/start/server'
 *
 * export async function action({ request }: { request: Request }) {
 *   const result = await refreshToken(request)
 *
 *   if (!result.ok) {
 *     return new Response('Token refresh failed', { status: 401 })
 *   }
 *
 *   return new Response(JSON.stringify({ ok: true }), {
 *     headers: {
 *       'Set-Cookie': result.setCookieHeaders?.join(', ') || '',
 *     }
 *   })
 * }
 * ```
 */
export async function refreshToken(request?: Request): Promise<{
  ok: boolean
  tokens?: AuthTokens
  setCookieHeaders?: string[]
  error?: string
}> {
  const serverAuth = getServerAuthInstance()
  const cookieHeader = getCookieHeader(request)

  // Get refresh token from cookies
  const refreshTokenValue = cookieHeader
    .split(';')
    .find((c) => c.trim().startsWith(`${getCookieName(COOKIE_NAMES.REFRESH_TOKEN)}=`))
    ?.split('=')[1]

  if (!refreshTokenValue) {
    return {
      ok: false,
      error: 'No refresh token found',
    }
  }

  // Call the refresh endpoint
  const result = await serverAuth.refreshToken(refreshTokenValue)

  if (!result.ok || !result.data?.tokens) {
    return {
      ok: false,
      error: result.error?.message || 'Token refresh failed',
    }
  }

  const tokens = result.data.tokens

  // Create Set-Cookie headers
  const setCookieHeaders = createSetCookieHeaders(tokens)

  return {
    ok: true,
    tokens,
    setCookieHeaders,
  }
}

/**
 * @deprecated Use `getSession()` instead - it now auto-refreshes tokens on 401
 *
 * Get session with automatic token refresh if expired
 * This is now the same as getSession() since auto-refresh is built-in
 */
export async function getSessionWithRefresh<U = User>(request?: Request): Promise<Session<U> | null> {
  return getSession<U>(request)
}

// ============================================================================
// Auth Actions
// ============================================================================

/**
 * Sign in a user and generate cookie headers
 * Reduces boilerplate in server actions
 * 
 * @example
 * ```tsx
 * export const login = createServerFn('POST', async (data) => {
 *   return await signIn(data.email, data.password)
 * })
 * ```
 */
export async function signIn(email: string, password: string): Promise<{
  ok: boolean
  user?: User
  error?: string
  setCookieHeaders?: string[]
}> {
  const config = getConfig()
  const { createAuth } = await import('@nightmar3/uauth-core')

  const auth = createAuth({
    baseURL: config.baseURL,
    storage: undefined, // No storage needed server-side
  })

  const result = await auth.signIn(email, password)

  if (!result.ok || !result.data) {
    return {
      ok: false,
      error: result.error?.message || 'Sign in failed',
    }
  }

  return {
    ok: true,
    user: result.data.user,
    setCookieHeaders: createSetCookieHeaders(result.data.tokens),
  }
}

/**
 * Sign up a user and generate cookie headers
 */
export async function signUp(data: { email: string; password: string; name?: string }): Promise<{
  ok: boolean
  user?: User
  error?: string
  setCookieHeaders?: string[]
}> {
  const config = getConfig()
  const { createAuth } = await import('@nightmar3/uauth-core')

  const auth = createAuth({
    baseURL: config.baseURL,
    storage: undefined,
  })

  const result = await auth.signUp(data)

  if (!result.ok || !result.data) {
    return {
      ok: false,
      error: result.error?.message || 'Sign up failed',
    }
  }

  return {
    ok: true,
    user: result.data.user,
    setCookieHeaders: createSetCookieHeaders(result.data.tokens),
  }
}

/**
 * Sign out a user and generate clear-cookie headers
 */
export async function signOut(): Promise<{
  ok: boolean
  setCookieHeaders: string[]
}> {
  const config = getConfig()

  // Clear cookies
  const setCookieHeaders = [
    `${getCookieName(COOKIE_NAMES.ACCESS_TOKEN)}=; Path=${config.cookies.path}; Max-Age=0; HttpOnly`,
    `${getCookieName(COOKIE_NAMES.REFRESH_TOKEN)}=; Path=${config.cookies.path}; Max-Age=0; HttpOnly`,
  ]

  return {
    ok: true,
    setCookieHeaders,
  }
}

// ============================================================================
// Re-exports
// ============================================================================

export { createServerAuth, getServerSession as getServerSessionBase } from '@nightmar3/uauth-server'
