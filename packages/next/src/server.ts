import { cookies } from 'next/headers'
import { createServerAuth, getServerSession as baseGetServerSession } from '@uauth/server'
import { getConfig, getCookieName, COOKIE_NAMES } from './config'
import type { Session, ServerAuthContext } from './types'
import type { User } from '@uauth/core'

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
    })
  }

  return serverAuthInstance
}

// ============================================================================
// Server Functions
// ============================================================================

/**
 * Get the current session in Server Components, Route Handlers, or Server Actions
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
  const sessionData = await baseGetServerSession(serverAuth, cookies)

  if (!sessionData) {
    return null
  }

  // Get the access token from cookies
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(getCookieName(COOKIE_NAMES.ACCESS_TOKEN))?.value || ''

  return {
    user: sessionData.user as U,
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
// Re-exports
// ============================================================================

export { createServerAuth, getServerSession as getServerSessionBase } from '@uauth/server'
