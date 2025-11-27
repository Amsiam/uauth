/**
 * Universal Auth SDK
 * One auth SDK. Any backend. Your data.
 */

import { UniversalAuthSDK } from './auth';
import type { User, AuthConfig, UniversalAuth } from './types';

export { UniversalAuthSDK } from './auth';
export { ApiClient } from './client';
export {
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter,
  CookieStorageAdapter,
  createStorageAdapter,
} from './storage';
export type { CookieStorageOptions } from './storage';

// Plugins
export { OAuth2Plugin, createOAuth2Plugin } from './plugins/oauth2';
export type {
  OAuth2Provider,
  OAuth2ProvidersResponse,
  OAuth2FlowOptions,
  OAuth2CallbackData,
} from './plugins/oauth2';

export type {
  // Main interfaces
  UniversalAuth,
  AuthConfig,
  // API types
  ApiResponse,
  ApiError,
  // Auth types
  AuthTokens,
  User,
  SignInData,
  SessionData,
  RefreshData,
  // Payload types
  SignUpPayload,
  PasswordSignInPayload,
  OAuth2SignInPayload,
  MagicLinkPayload,
  // Storage
  StorageAdapter,
  FetchFunction,
  RequestOptions,
  // Plugin system
  Plugin,
  PluginContext,
  PluginManifest,
  ApiClient as ApiClientInterface,
  AuthCore,
} from './types';

/**
 * Create a new Universal Auth SDK instance (client-side)
 *
 * @throws Error if used in a server environment (Node.js without window)
 */
export function createAuth<U extends User = User>(
  config: AuthConfig
): UniversalAuth<U> {
  // Warn if used on server (but don't block - some SSR frameworks hydrate)
  if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
    console.warn(
      '[@uauth/core] createAuth() is designed for client-side use. ' +
      'For server-side authentication, use createServerAuth() from "@uauth/server" instead.'
    );
  }
  return new UniversalAuthSDK<U>(config);
}

// Default export
export default createAuth;
