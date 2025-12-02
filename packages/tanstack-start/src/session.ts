/**
 * Universal Auth SDK - TanStack Start Session Management
 */

import { useSession } from '@tanstack/react-start/server'
import type { SessionData } from './types'
import { getConfig } from './config'

/**
 * Get or create auth session using TanStack Start's useSession
 * This should be called from server functions only
 *
 * @example
 * ```ts
 * import { useAuthSession } from './session'
 *
 * export const myServerFn = createServerFn().handler(async () => {
 *   const session = await useAuthSession()
 *   const userId = session.data.userId
 *   // ...
 * })
 * ```
 */
export function useAuthSession(): ReturnType<typeof useSession<SessionData>> {
  const config = getConfig()

  return useSession<SessionData>({
    name: 'uauth-session',
    password: config.sessionSecret!,
    cookie: {
      secure: config.cookies?.secure ?? true,
      sameSite: (config.cookies?.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
      httpOnly: true,
      path: config.cookies?.path ?? '/',
      maxAge: config.cookies?.maxAge ?? 60 * 60 * 24 * 7, // 7 days
    },
  })
}
