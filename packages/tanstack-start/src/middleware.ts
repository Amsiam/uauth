/**
 * Universal Auth SDK - TanStack Start Middleware
 *
 * Middleware utilities for authentication in TanStack Start
 */

import { createMiddleware } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import type { AuthBeforeLoadOptions } from './types'
import { getSessionFn } from './server'

/**
 * Create auth middleware for server functions
 * Validates that user is authenticated before executing server function
 *
 * @example
 * ```ts
 * const authMiddleware = createAuthMiddleware()
 *
 * export const protectedFn = createServerFn()
 *   .middleware([authMiddleware])
 *   .handler(async ({ context }) => {
 *     // context.user is guaranteed to exist
 *     return { userId: context.user.id }
 *   })
 * ```
 */
export function createAuthMiddleware() {
  return createMiddleware({ type: 'function' }).server(async ({ next }) => {
    const session = await getSessionFn()

    if (!session || !session.user) {
      throw new Error('Unauthorized: Authentication required')
    }

    // Add user to context for downstream handlers
    return next({
      context: {
        user: session.user,
        accessToken: session.accessToken,
      },
    })
  })
}

/**
 * Create global auth middleware (optional)
 * Adds auth context to all requests without blocking
 * Use route-level protection for actual auth enforcement
 *
 * @example
 * ```ts
 * // src/start.ts
 * import { createGlobalAuthMiddleware } from '@nightmar3/uauth-tanstack-start/middleware'
 *
 * export const startInstance = createStart(() => {
 *   return {
 *     requestMiddleware: [createGlobalAuthMiddleware()],
 *   }
 * })
 * ```
 */
export function createGlobalAuthMiddleware() {
  return createMiddleware().server(async ({ next }) => {
    const session = await getSessionFn()

    // Add auth context without blocking
    return next({
      context: {
        user: session?.user ?? null,
        isAuthenticated: !!session?.user,
      },
    })
  })
}

/**
 * Create beforeLoad helper for route protection
 * Checks authentication and redirects if not authenticated
 *
 * @example
 * ```ts
 * // routes/dashboard.tsx
 * export const Route = createFileRoute('/dashboard')({
 *   beforeLoad: createAuthBeforeLoad({ redirectTo: '/login' }),
 *   loader: async ({ context }) => {
 *     // context.user is available here
 *     return { data: await fetchUserData(context.user.id) }
 *   },
 * })
 * ```
 */
export function createAuthBeforeLoad(options: AuthBeforeLoadOptions = {}) {
  const { redirectTo = '/login' } = options

  return async ({ context }: { context: any }) => {
    // Use session from root context to avoid redundant fetches
    const isAuthenticated = context.isAuthenticated ?? false
    const user = context.user ?? null

    if (!isAuthenticated || !user) {
      throw redirect({
        to: redirectTo,
        search: {
          redirect: typeof window !== 'undefined' ? window.location.pathname : undefined,
        },
      })
    }

    // Return user in context for loaders and components
    return {
      user,
      isAuthenticated: true,
    }
  }
}

/**
 * Simple auth requirement for routes
 * Just checks auth and redirects to /login if not authenticated
 *
 * @example
 * ```ts
 * export const Route = createFileRoute('/protected')({
 *   beforeLoad: requireAuth,
 * })
 * ```
 */
export const requireAuth = createAuthBeforeLoad()
