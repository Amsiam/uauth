/**
 * Universal Auth SDK
 * One auth SDK. Any backend. Your data.
 */

export { UniversalAuthSDK } from './auth';
export { ApiClient } from './client';
export {
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter,
  createStorageAdapter,
} from './storage';

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
 * Create a new Universal Auth SDK instance
 */
export function createAuth<U extends import('./types').User = import('./types').User>(
  config: import('./types').AuthConfig
): import('./types').UniversalAuth<U> {
  return new UniversalAuthSDK<U>(config);
}

// Default export
export default createAuth;
