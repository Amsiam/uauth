/**
 * @nightmar3/uauth-tanstack-start
 *
 * TanStack Start integration for Universal Auth SDK
 * Zero-config authentication with full SSR support
 *
 * @example
 * ```tsx
 * // 1. Configure in your app (optional - uses env vars by default)
 * import { configureAuth } from '@nightmar3/uauth-tanstack-start'
 *
 * configureAuth({
 *   baseURL: 'https://api.yourapp.com/auth',
 *   sessionSecret: process.env.SESSION_SECRET!,
 * })
 *
 * // 2. Set up auth in routes/__root.tsx
 * import { createRootRoute } from '@tanstack/react-router'
 * import { getSessionFn } from '@nightmar3/uauth-tanstack-start/server'
 *
 * export const Route = createRootRoute({
 *   loader: async () => {
 *     const session = await getSessionFn()
 *     return {
 *       user: session?.user ?? null,
 *       isAuthenticated: !!session?.user,
 *     }
 *   },
 * })
 *
 * // 3. Use in components
 * import { useAuth } from '@nightmar3/uauth-tanstack-start/client'
 *
 * function Profile() {
 *   const { user, signOut } = useAuth()
 *   return <button onClick={signOut}>Sign out {user?.name}</button>
 * }
 *
 * // 4. Protect routes
 * import { createAuthBeforeLoad } from '@nightmar3/uauth-tanstack-start/middleware'
 *
 * export const Route = createFileRoute('/dashboard')({
 *   beforeLoad: createAuthBeforeLoad({ redirectTo: '/login' }),
 * })
 * ```
 *
 * @packageDocumentation
 */

// Configuration
export { configureAuth, getConfig, getCookieName, COOKIE_NAMES } from './config'

// Types
export type {
  UAuthTanStackConfig,
  SessionData,
  Session,
  AuthRouterContext,
  AuthBeforeLoadOptions,
  User,
  AuthTokens,
  ApiResponse,
  ApiError,
} from './types'

// Client exports (re-exported for convenience)
export {
  useAuth,
  useUser,
  useSession,
  SignedIn,
  SignedOut,
  AuthGate,
} from './client'

// Context utilities
export { createAuthRouterContext } from './context'

// Server exports (re-exported for convenience)
export {
  signInFn,
  signUpFn,
  signOutFn,
  getSessionFn,
  getUserFn,
  refreshTokenFn,
} from './server'

// Middleware exports (re-exported for convenience)
export {
  createAuthMiddleware,
  createGlobalAuthMiddleware,
  createAuthBeforeLoad,
  requireAuth,
} from './middleware'
