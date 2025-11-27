/**
 * @uauth/next - Next.js integration for Universal Auth SDK
 *
 * Zero-config authentication for Next.js applications
 *
 * @example
 * ```tsx
 * // 1. Configure in layout.tsx
 * import { AuthProvider, configureAuth } from '@uauth/next'
 *
 * // Optional: Override default config
 * configureAuth({ baseURL: 'https://api.example.com/auth' })
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <AuthProvider>{children}</AuthProvider>
 *       </body>
 *     </html>
 *   )
 * }
 *
 * // 2. Use in components
 * import { useAuth } from '@uauth/next'
 *
 * function Profile() {
 *   const { user, signOut } = useAuth()
 *   return <button onClick={signOut}>Sign out {user?.name}</button>
 * }
 *
 * // 3. Use in Server Components
 * import { getSession } from '@uauth/next/server'
 *
 * async function ServerProfile() {
 *   const session = await getSession()
 *   return <div>Hello, {session?.user.name}</div>
 * }
 *
 * // 4. Protect routes with middleware
 * // middleware.ts
 * import { authMiddleware } from '@uauth/next/middleware'
 *
 * export default authMiddleware({
 *   protectedRoutes: ['/dashboard/**'],
 * })
 * ```
 *
 * @packageDocumentation
 */

// Configuration
export { configureAuth, getConfig } from './config'

// Types
export type {
  UAuthNextConfig,
  Session,
  ServerAuthContext,
  ProtectOptions,
  RouteMatcher,
  MiddlewareConfig,
} from './types'

// Client exports (re-exported for convenience)
export {
  AuthProvider,
  useAuth,
  useUser,
  useSession,
  SignedIn,
  SignedOut,
  AuthGate,
  OAuthButton,
  OAuthButtons,
  type AuthProviderProps,
  type OAuthButtonProps,
  type OAuthButtonsProps,
  type OAuthButtonRenderProps,
} from './client'

// Re-export core types for convenience
export type {
  User,
  AuthTokens,
  ApiResponse,
  ApiError,
  OAuth2Provider,
} from '@uauth/core'
