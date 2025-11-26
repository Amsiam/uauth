/**
 * Next.js specific utilities
 */

import type { User, SessionData, ApiResponse } from '@uauth/core';
import { ServerAuth } from './server-auth';

export interface NextJSMiddlewareConfig {
  auth: ServerAuth;
  redirectTo?: string;
  publicPaths?: string[];
}

/**
 * Create Next.js middleware for authentication
 *
 * Example usage:
 *
 * ```ts
 * import { NextResponse } from 'next/server';
 * import { createServerAuth } from 'universal-auth-sdk/server';
 *
 * const auth = createServerAuth({ baseURL: process.env.AUTH_API_URL! });
 *
 * export async function middleware(request: Request) {
 *   const session = await auth.getSessionFromRequest(request);
 *
 *   if (!session.ok) {
 *     return NextResponse.redirect(new URL('/login', request.url));
 *   }
 *
 *   return NextResponse.next();
 * }
 * ```
 */
export function createAuthMiddleware<U extends User = User>(
  config: NextJSMiddlewareConfig
) {
  const { auth, redirectTo = '/login', publicPaths = [] } = config;

  return async function middleware(request: Request) {
    const { pathname } = new URL(request.url);

    // Check if path is public
    const isPublicPath = publicPaths.some((path) => {
      if (path.endsWith('*')) {
        return pathname.startsWith(path.slice(0, -1));
      }
      return pathname === path;
    });

    if (isPublicPath) {
      return null; // Allow through without auth check
    }

    // Get session
    const session = await auth.getSessionFromRequest(request);

    if (!session.ok) {
      return {
        redirect: redirectTo,
        session: null,
      };
    }

    return {
      redirect: null,
      session: session.data,
    };
  };
}

/**
 * Helper for Next.js App Router server components
 *
 * Example:
 * ```ts
 * import { cookies } from 'next/headers';
 * import { getServerSession } from 'universal-auth-sdk/server';
 *
 * export default async function Page() {
 *   const auth = createServerAuth({ baseURL: process.env.AUTH_API_URL! });
 *   const session = await getServerSession(auth, cookies);
 *
 *   if (!session) {
 *     redirect('/login');
 *   }
 *
 *   return <div>Hello {session.user.name}</div>;
 * }
 * ```
 */
export async function getServerSession<U extends User = User>(
  auth: ServerAuth<U>,
  cookies: () => Promise<any>
): Promise<SessionData<U> | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c: any) => `${c.name}=${c.value}`)
    .join('; ');

  const session = await auth.getSession(cookieHeader);

  return session.ok ? session.data : null;
}
