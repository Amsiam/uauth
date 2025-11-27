import { authMiddleware } from '@uauth/next/middleware'

/**
 * Auth middleware configuration
 *
 * With @uauth/next, route protection is simple:
 * - List protected routes (supports glob patterns)
 * - Unauthenticated users are redirected to /login
 * - Authenticated users on /login are redirected to /dashboard
 */
export default authMiddleware({
  protectedRoutes: ['/dashboard/**'],
  loginUrl: '/login',
  afterLoginUrl: '/dashboard',
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public folder files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
