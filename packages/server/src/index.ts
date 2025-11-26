/**
 * Universal Auth SDK - Server Utilities
 */

export { ServerAuth, createServerAuth } from './server-auth';
export type { ServerAuthConfig } from './server-auth';

export {
  serializeCookie,
  parseCookies,
  deleteCookie,
} from './cookies';
export type { CookieOptions } from './cookies';

export { createAuthMiddleware, getServerSession } from './nextjs';
export type { NextJSMiddlewareConfig } from './nextjs';

// Re-export types from core SDK for convenience
export type {
  User,
  SessionData,
  ApiResponse,
  ApiError,
} from '@uauth/core';
