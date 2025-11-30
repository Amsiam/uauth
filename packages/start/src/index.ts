/**
 * @uauth/start - TanStack Start integration for Universal Auth SDK
 *
 * Zero-config authentication for TanStack Start applications
 *
 * @example
 * ```tsx
 * // 1. Configure in root route
 * import { AuthProvider, configureAuth } from '@uauth/start'
 *
 * // Optional: Override default config
 * configureAuth({ baseURL: 'https://api.example.com/auth' })
 *
 * export const Route = createRootRoute({
 *   component: () => (
 *     <AuthProvider>
 *       <Outlet />
 *     </AuthProvider>
 *   )
 * })
 *
 * // 2. Use in components
 * import { useAuth } from '@uauth/start'
 *
 * function Profile() {
 *   const { user, signOut } = useAuth()
 *   return <button onClick={signOut}>Sign out {user?.name}</button>
 * }
 *
 * // 3. Use in Server Functions
 * import { getSession } from '@uauth/start/server'
 *
 * export const Route = createFileRoute('/profile')({
 *   loader: async ({ context }) => {
 *     const session = await getSession(context.request)
 *     return { user: session?.user }
 *   }
 * })
 *
 * // 4. Protect routes with middleware
 * import { authMiddleware } from '@uauth/start/middleware'
 *
 * export const Route = createRootRoute({
 *   beforeLoad: authMiddleware({
 *     protectedRoutes: ['/dashboard/**'],
 *   })
 * })
 * ```
 *
 * @packageDocumentation
 */

// Configuration
export { configureAuth, getConfig } from './config'

// Types
export type {
    MiddlewareConfig, ProtectOptions,
    RouteMatcher, ServerAuthContext, Session, UAuthStartConfig
} from './types'

// Client exports (re-exported for convenience)
export {
    AuthGate, AuthProvider, SignedIn,
    SignedOut, createOAuth2Plugin, useAuth, useOAuth, useSession, useUser, type AuthProviderProps,
    type Plugin
} from './client'

// Re-export core types for convenience
export type {
    ApiError, ApiResponse, AuthTokens, User
} from '@nightmar3/uauth-core'

