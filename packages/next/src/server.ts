import { cookies } from 'next/headers'
import { createServerAuth } from '@nightmar3/uauth-server'
import { getConfig, getCookieName, COOKIE_NAMES } from './config'
import type { Session, ServerAuthContext } from './types'
import type { User, AuthTokens } from '@nightmar3/uauth-core'

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
 * Create a callback to set new tokens in cookies after refresh
 */
async function createTokenRefreshCallback(): Promise<(tokens: AuthTokens) => Promise<void>> {
  const cookieStore = await cookies()
  const config = getConfig()

  return async (tokens: AuthTokens) => {
    // Set new access token
    cookieStore.set(getCookieName(COOKIE_NAMES.ACCESS_TOKEN), tokens.access_token, {
      path: config.cookies.path,
      domain: config.cookies.domain || undefined,
      maxAge: tokens.expires_in,
      secure: config.cookies.secure,
      sameSite: config.cookies.sameSite as 'lax' | 'strict' | 'none',
      httpOnly: true,
    })

    // Set new refresh token
    cookieStore.set(getCookieName(COOKIE_NAMES.REFRESH_TOKEN), tokens.refresh_token, {
      path: config.cookies.path,
      domain: config.cookies.domain || undefined,
      maxAge: config.cookies.maxAge,
      secure: config.cookies.secure,
      sameSite: config.cookies.sameSite as 'lax' | 'strict' | 'none',
      httpOnly: true,
    })
  }
}

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Get the current session in Server Components, Route Handlers, or Server Actions
 * Automatically refreshes tokens if they are expired (401 response)
 *
 * @example
 * ```tsx
 * // app/dashboard/page.tsx (Server Component)
 * import { getSession } from '@uauth/next/server'
 *
 * export default async function DashboardPage() {
 *   const session = await getSession()
 *
 *   if (!session) {
 *     redirect('/login')
 *   }
 *
 *   return <div>Welcome, {session.user.name}</div>
 * }
 * ```
 */
export async function getSession<U = User>(): Promise<Session<U> | null> {
  const serverAuth = getServerAuthInstance()
  const cookieStore = await cookies()

  // Build cookie header from Next.js cookies
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')

  // Create callback to set new cookies if tokens are refreshed
  const onTokenRefresh = await createTokenRefreshCallback()

  // Get session with auto-refresh on 401
  const result = await serverAuth.getSession(cookieHeader, onTokenRefresh)

  if (!result.ok || !result.data) {
    return null
  }

  // Get the access token (may have been refreshed)
  const accessToken = cookieStore.get(getCookieName(COOKIE_NAMES.ACCESS_TOKEN))?.value || ''

  return {
    user: result.data.user as U,
    accessToken,
  }
}

/**
 * Get the current user in Server Components
 * Returns null if not authenticated
 *
 * @example
 * ```tsx
 * // app/profile/page.tsx
 * import { getUser } from '@uauth/next/server'
 *
 * export default async function ProfilePage() {
 *   const user = await getUser()
 *   return <div>Hello, {user?.name ?? 'Guest'}</div>
 * }
 * ```
 */
export async function getUser<U = User>(): Promise<U | null> {
  const session = await getSession<U>()
  return session?.user ?? null
}

/**
 * Get auth context for lightweight checks
 * Returns userId and sessionToken if authenticated
 *
 * @example
 * ```tsx
 * // app/api/protected/route.ts
 * import { auth } from '@uauth/next/server'
 *
 * export async function GET() {
 *   const { userId } = await auth()
 *
 *   if (!userId) {
 *     return new Response('Unauthorized', { status: 401 })
 *   }
 *
 *   return Response.json({ userId })
 * }
 * ```
 */
export async function auth(): Promise<ServerAuthContext> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(getCookieName(COOKIE_NAMES.ACCESS_TOKEN))?.value

  if (!accessToken) {
    return { userId: null, sessionToken: null }
  }

  // Try to get full session
  const session = await getSession()

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
 * // app/api/protected/route.ts
 * import { isAuthenticated } from '@uauth/next/server'
 *
 * export async function GET() {
 *   if (!(await isAuthenticated())) {
 *     return new Response('Unauthorized', { status: 401 })
 *   }
 *   // ... handle request
 * }
 * ```
 */
export async function isAuthenticated(): Promise<boolean> {
  const { userId } = await auth()
  return userId !== null
}

/**
 * Protect a route handler - throws if not authenticated
 *
 * @example
 * ```tsx
 * // app/api/protected/route.ts
 * import { protect } from '@uauth/next/server'
 *
 * export async function GET() {
 *   const { userId } = await protect()
 *   return Response.json({ userId })
 * }
 * ```
 */
export async function protect(): Promise<ServerAuthContext & { userId: string; sessionToken: string }> {
  const context = await auth()

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
 * Returns new tokens and automatically sets the cookies
 *
 * @example
 * ```tsx
 * // app/api/refresh/route.ts
 * import { refreshToken } from '@uauth/next/server'
 *
 * export async function POST() {
 *   const result = await refreshToken()
 *
 *   if (!result.ok) {
 *     return new Response('Token refresh failed', { status: 401 })
 *   }
 *
 *   return Response.json({ ok: true })
 * }
 * ```
 */
export async function refreshToken(): Promise<{
  ok: boolean
  tokens?: AuthTokens
  error?: string
}> {
  const serverAuth = getServerAuthInstance()
  const cookieStore = await cookies()
  const config = getConfig()

  // Get refresh token from cookies
  const refreshTokenValue = cookieStore.get(getCookieName(COOKIE_NAMES.REFRESH_TOKEN))?.value

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

  // Set new cookies with the refreshed tokens
  cookieStore.set(getCookieName(COOKIE_NAMES.ACCESS_TOKEN), tokens.access_token, {
    path: config.cookies.path,
    domain: config.cookies.domain || undefined,
    maxAge: tokens.expires_in,
    secure: config.cookies.secure,
    sameSite: config.cookies.sameSite as 'lax' | 'strict' | 'none',
    httpOnly: true,
  })

  cookieStore.set(getCookieName(COOKIE_NAMES.REFRESH_TOKEN), tokens.refresh_token, {
    path: config.cookies.path,
    domain: config.cookies.domain || undefined,
    maxAge: config.cookies.maxAge, // Refresh token lives longer
    secure: config.cookies.secure,
    sameSite: config.cookies.sameSite as 'lax' | 'strict' | 'none',
    httpOnly: true,
  })

  return {
    ok: true,
    tokens,
  }
}

/**
 * @deprecated Use `getSession()` instead - it now auto-refreshes tokens on 401
 *
 * Get session with automatic token refresh if expired
 * This is now the same as getSession() since auto-refresh is built-in
 */
export async function getSessionWithRefresh<U = User>(): Promise<Session<U> | null> {
  return getSession<U>()
}

// ============================================================================
// Re-exports
// ============================================================================

export { createServerAuth, getServerSession as getServerSessionBase } from '@nightmar3/uauth-server'
