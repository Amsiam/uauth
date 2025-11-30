import { COOKIE_NAMES, getCookieName } from './config'
import type { MiddlewareConfig, RouteMatcher } from './types'

/**
 * Match a pathname against a route pattern
 * Supports:
 * - Exact match: /dashboard
 * - Single wildcard: /dashboard/*
 * - Glob wildcard: /dashboard/**
 */
function matchRoute(pathname: string, pattern: string): boolean {
  // Exact match
  if (pattern === pathname) return true

  // Glob pattern: /dashboard/**
  if (pattern.endsWith('/**')) {
    const base = pattern.slice(0, -3)
    return pathname === base || pathname.startsWith(base + '/')
  }

  // Single level wildcard: /dashboard/*
  if (pattern.endsWith('/*')) {
    const base = pattern.slice(0, -2)
    const remainder = pathname.slice(base.length)
    return pathname.startsWith(base + '/') && !remainder.slice(1).includes('/')
  }

  return false
}

/**
 * Check if a pathname matches any of the route patterns
 */
function matchesAnyRoute(pathname: string, routes: string[] | RouteMatcher | undefined): boolean {
  if (!routes) return false

  if (typeof routes === 'function') {
    return routes(pathname)
  }

  return routes.some((pattern) => matchRoute(pathname, pattern))
}

/**
 * Check if user is authenticated by looking for access token in cookies
 */
function isAuthenticatedFromCookies(cookieHeader: string): boolean {
  const cookieName = getCookieName(COOKIE_NAMES.ACCESS_TOKEN)
  return cookieHeader.split(';').some((c) => c.trim().startsWith(`${cookieName}=`))
}

/**
 * Create auth middleware for TanStack Start
 * This middleware protects routes and redirects unauthenticated users
 *
 * @example
 * ```tsx
 * // app/routes/__root.tsx
 * import { createRootRoute } from '@tanstack/react-router'
 * import { authMiddleware } from '@uauth/start/middleware'
 *
 * export const Route = createRootRoute({
 *   beforeLoad: authMiddleware({
 *     protectedRoutes: ['/dashboard', '/dashboard/**', '/settings/**'],
 *     loginUrl: '/login',
 *   })
 * })
 * ```
 */
export function authMiddleware(config: MiddlewareConfig = {}) {
  const {
    protectedRoutes = [],
    publicRoutes = [],
    loginUrl = '/login',
    afterLoginUrl = '/dashboard',
    debug = false,
  } = config

  return async ({ location, request }: { location: { pathname: string }; request?: Request }) => {
    const pathname = location.pathname

    if (debug) {
      console.log('[authMiddleware]', { pathname })
    }

    // Check if route is explicitly public
    if (matchesAnyRoute(pathname, publicRoutes)) {
      if (debug) console.log('[authMiddleware] Public route, allowing')
      return
    }

    // Check if route requires protection
    const requiresAuth = matchesAnyRoute(pathname, protectedRoutes)

    if (!requiresAuth) {
      if (debug) console.log('[authMiddleware] Not a protected route, allowing')
      return
    }

    // Get cookie header from request
    const cookieHeader = request?.headers.get('cookie') || ''
    const isAuthenticated = isAuthenticatedFromCookies(cookieHeader)

    if (debug) {
      console.log('[authMiddleware]', { isAuthenticated, requiresAuth })
    }

    // Redirect to login if not authenticated
    if (requiresAuth && !isAuthenticated) {
      if (debug) console.log('[authMiddleware] Redirecting to login')
      throw new Error(`Redirect to ${loginUrl}`) // TanStack Router will handle this
    }

    // Redirect authenticated users away from login page
    if (pathname === loginUrl && isAuthenticated) {
      if (debug) console.log('[authMiddleware] Redirecting to dashboard')
      throw new Error(`Redirect to ${afterLoginUrl}`)
    }
  }
}

/**
 * Create a route-specific protection helper
 * Use this in individual route loaders/beforeLoad
 *
 * @example
 * ```tsx
 * import { createFileRoute } from '@tanstack/react-router'
 * import { requireAuth } from '@uauth/start/middleware'
 *
 * export const Route = createFileRoute('/dashboard')({
 *   beforeLoad: requireAuth({ loginUrl: '/login' })
 * })
 * ```
 */
export function requireAuth(options: { loginUrl?: string } = {}) {
  const { loginUrl = '/login' } = options

  return ({ request }: { request?: Request }) => {
    const cookieHeader = request?.headers.get('cookie') || ''
    const isAuthenticated = isAuthenticatedFromCookies(cookieHeader)

    if (!isAuthenticated) {
      throw new Error(`Redirect to ${loginUrl}`)
    }
  }
}

/**
 * Redirect authenticated users away from a route (e.g., login page)
 *
 * @example
 * ```tsx
 * import { createFileRoute } from '@tanstack/react-router'
 * import { redirectIfAuthenticated } from '@uauth/start/middleware'
 *
 * export const Route = createFileRoute('/login')({
 *   beforeLoad: redirectIfAuthenticated({ redirectTo: '/dashboard' })
 * })
 * ```
 */
export function redirectIfAuthenticated(options: { redirectTo?: string } = {}) {
  const { redirectTo = '/dashboard' } = options

  return ({ request }: { request?: Request }) => {
    const cookieHeader = request?.headers.get('cookie') || ''
    const isAuthenticated = isAuthenticatedFromCookies(cookieHeader)

    if (isAuthenticated) {
      throw new Error(`Redirect to ${redirectTo}`)
    }
  }
}
