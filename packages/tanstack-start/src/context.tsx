/**
 * Universal Auth SDK - TanStack Start Router Context
 *
 * Router context utilities for auth state
 */

import type { AuthRouterContext, User } from './types'

/**
 * Create auth router context for use in __root.tsx
 * This is a helper type for TypeScript inference
 *
 * @example
 * ```ts
 * // routes/__root.tsx
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
 * ```
 */
export function createAuthRouterContext<U extends User = User>(): AuthRouterContext<U> {
  return {
    user: null,
    isAuthenticated: false,
  }
}
