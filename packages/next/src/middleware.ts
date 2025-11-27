import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { MiddlewareConfig, RouteMatcher } from './types'
import { getConfig, getCookieName, COOKIE_NAMES } from './config'

/**
 * Create a route matcher from an array of paths or patterns
 */
export function createRouteMatcher(routes: string[]): RouteMatcher {
  // Convert paths to regex patterns
  const patterns = routes.map((route) => {
    // Convert glob-style patterns to regex
    // /dashboard/* -> /dashboard(/[^/]*)?  (matches /dashboard, /dashboard/foo)
    // /admin/** -> /admin(/.*)?  (matches /admin, /admin/foo, /admin/foo/bar)
    let pattern = route

    // Handle double star first (matches any path including nested)
    // /admin/** -> matches /admin, /admin/x, /admin/x/y
    pattern = pattern.replace(/\/\*\*$/g, '(/.*)?')
    pattern = pattern.replace(/\/\*\*/g, '(/[^/]*)*')

    // Handle single star (matches single path segment)
    // /dashboard/* -> matches /dashboard, /dashboard/x
    pattern = pattern.replace(/\/\*$/g, '(/[^/]*)?')
    pattern = pattern.replace(/\*/g, '[^/]*')

    // Ensure exact match at start
    pattern = '^' + pattern

    // Ensure exact match at end (unless already has pattern end)
    if (!pattern.endsWith('$') && !pattern.endsWith(')?')) {
      pattern = pattern + '$'
    }

    return new RegExp(pattern)
  })

  return (pathname: string) => patterns.some((p) => p.test(pathname))
}

/**
 * Check if a pathname matches public routes
 */
function isPublicRoute(
  pathname: string,
  publicRoutes?: string[] | RouteMatcher
): boolean {
  if (!publicRoutes) return false

  if (typeof publicRoutes === 'function') {
    return publicRoutes(pathname)
  }

  const matcher = createRouteMatcher(publicRoutes)
  return matcher(pathname)
}

/**
 * Check if a pathname matches protected routes
 */
function isProtectedRoute(
  pathname: string,
  protectedRoutes?: string[] | RouteMatcher
): boolean {
  if (!protectedRoutes) return false

  if (typeof protectedRoutes === 'function') {
    return protectedRoutes(pathname)
  }

  const matcher = createRouteMatcher(protectedRoutes)
  return matcher(pathname)
}

/**
 * Default public routes (always accessible)
 */
const DEFAULT_PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/sign-in',
  '/sign-up',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth/**',
  '/_next/**',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
]

/**
 * Create auth middleware for Next.js
 *
 * @example
 * ```ts
 * // middleware.ts
 * import { authMiddleware } from '@uauth/next/middleware'
 *
 * export default authMiddleware({
 *   protectedRoutes: ['/dashboard/**', '/settings/**'],
 *   publicRoutes: ['/about', '/contact'],
 * })
 *
 * export const config = {
 *   matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
 * }
 * ```
 */
export function authMiddleware(options: MiddlewareConfig = {}) {
  const {
    protectedRoutes,
    publicRoutes,
    loginUrl = '/login',
    afterLoginUrl = '/dashboard',
    debug = false,
  } = options

  // Combine user-provided public routes with defaults
  const allPublicRoutes = [
    ...DEFAULT_PUBLIC_ROUTES,
    ...(Array.isArray(publicRoutes) ? publicRoutes : []),
    loginUrl,
  ]

  return async function middleware(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl

    // Debug logging
    if (debug) {
      console.log(`[@uauth/next] Middleware: ${pathname}`)
    }

    // Check for auth token in cookies
    const cookieName = getCookieName(COOKIE_NAMES.ACCESS_TOKEN)
    const hasToken = request.cookies.has(cookieName)

    if (debug) {
      console.log(`[@uauth/next] Has token: ${hasToken}, Cookie name: ${cookieName}`)
    }

    // Check if this is a public route
    const isPublic = isPublicRoute(pathname, allPublicRoutes) ||
      (typeof publicRoutes === 'function' && publicRoutes(pathname))

    // Check if this is a protected route
    const isProtected = protectedRoutes
      ? isProtectedRoute(pathname, protectedRoutes)
      : !isPublic // If no protected routes defined, everything except public is protected

    if (debug) {
      console.log(`[@uauth/next] Is public: ${isPublic}, Is protected: ${isProtected}`)
    }

    // Redirect unauthenticated users from protected routes
    if (isProtected && !hasToken) {
      if (debug) {
        console.log(`[@uauth/next] Redirecting to login: ${loginUrl}`)
      }

      const url = new URL(loginUrl, request.url)
      url.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(url)
    }

    // Redirect authenticated users from login page
    if (hasToken && pathname === loginUrl) {
      if (debug) {
        console.log(`[@uauth/next] Redirecting authenticated user to: ${afterLoginUrl}`)
      }

      return NextResponse.redirect(new URL(afterLoginUrl, request.url))
    }

    return NextResponse.next()
  }
}

/**
 * Simple middleware that just protects specific routes
 *
 * @example
 * ```ts
 * // middleware.ts
 * import { withAuth } from '@uauth/next/middleware'
 *
 * export default withAuth
 *
 * export const config = {
 *   matcher: ['/dashboard/:path*', '/settings/:path*'],
 * }
 * ```
 */
export const withAuth = authMiddleware()

/**
 * Create a custom auth middleware with additional logic
 *
 * @example
 * ```ts
 * // middleware.ts
 * import { createMiddleware } from '@uauth/next/middleware'
 *
 * export default createMiddleware((auth, request) => {
 *   // Custom logic
 *   if (!auth.hasToken && request.nextUrl.pathname.startsWith('/admin')) {
 *     return Response.redirect(new URL('/login', request.url))
 *   }
 *   return null // Continue to next middleware
 * })
 * ```
 */
export function createMiddleware(
  handler: (
    auth: { hasToken: boolean; token: string | undefined },
    request: NextRequest
  ) => Response | NextResponse | null | Promise<Response | NextResponse | null>
) {
  return async function middleware(request: NextRequest): Promise<NextResponse> {
    const cookieName = getCookieName(COOKIE_NAMES.ACCESS_TOKEN)
    const token = request.cookies.get(cookieName)?.value

    const result = await handler(
      { hasToken: !!token, token },
      request
    )

    if (result) {
      return result instanceof NextResponse ? result : NextResponse.json(result)
    }

    return NextResponse.next()
  }
}
