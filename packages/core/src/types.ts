/**
 * Standard response envelope for all API calls
 */
export interface ApiResponse<T = any> {
  ok: boolean;
  data: T | null;
  error: ApiError | null;
}

/**
 * Standard error format
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Authentication tokens returned by the backend
 */
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * User object (can have custom fields)
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  [key: string]: any;
}

/**
 * Sign-in response data
 */
export interface SignInData<U = User> {
  user: U;
  tokens: AuthTokens;
}

/**
 * Session response data
 */
export interface SessionData<U = User> {
  user: U;
  org?: any;
  [key: string]: any;
}

/**
 * Token refresh response data
 */
export interface RefreshData {
  tokens: AuthTokens;
}

/**
 * Sign-up payload
 */
export interface SignUpPayload {
  email: string;
  password: string;
  name?: string;
  [key: string]: any;
}

/**
 * Password sign-in payload
 */
export interface PasswordSignInPayload {
  email: string;
  password: string;
}

/**
 * OAuth sign-in payload
 */
export interface OAuth2SignInPayload {
  provider: string;
  code?: string;
  redirect_uri?: string;
}

/**
 * Magic link sign-in payload
 */
export interface MagicLinkPayload {
  email: string;
}

/**
 * Storage adapter interface
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

/**
 * Fetch function type
 */
export type FetchFunction = typeof fetch;

/**
 * Request options for API calls
 */
export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

/**
 * Configuration for creating the auth client
 */
export interface AuthConfig {
  baseURL: string;
  storage?: StorageAdapter;
  fetch?: FetchFunction;
  storageKeyPrefix?: string;
  onTokenRefresh?: (tokens: AuthTokens) => void;
  onAuthError?: (error: ApiError) => void;
}

/**
 * Plugin interface
 */
export interface Plugin {
  name: string;
  version: string;
  install(context: PluginContext): void | Promise<void>;
}

/**
 * Plugin context provided to plugins
 */
export interface PluginContext {
  client: ApiClient;
  core: AuthCore;
  sdk: UniversalAuth;
}

/**
 * API client interface
 */
export interface ApiClient {
  req<T = any>(
    path: string,
    body?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>>;
}

/**
 * Core auth methods interface
 */
export interface AuthCore {
  getToken(): Promise<string | null>;
  setTokens(tokens: AuthTokens): Promise<void>;
  clearTokens(): Promise<void>;
  refresh(): Promise<ApiResponse<RefreshData>>;
}

/**
 * Main SDK interface
 */
export interface UniversalAuth<U = User> {
  // Authentication
  signIn(
    method: 'password',
    payload: PasswordSignInPayload
  ): Promise<ApiResponse<SignInData<U>>>;
  signIn(
    method: 'oauth2',
    payload: OAuth2SignInPayload
  ): Promise<ApiResponse<SignInData<U>>>;
  signIn(
    method: 'magic-link',
    payload: MagicLinkPayload
  ): Promise<ApiResponse<SignInData<U>>>;
  signIn(method: string, payload: any): Promise<ApiResponse<SignInData<U>>>;

  signUp(payload: SignUpPayload): Promise<ApiResponse<SignInData<U>>>;
  signOut(): Promise<ApiResponse<{ ok: boolean }>>;

  // Session
  session(): Promise<ApiResponse<SessionData<U>>>;
  refresh(): Promise<ApiResponse<RefreshData>>;

  // Utilities
  isAuthenticated(): Promise<boolean>;
  getToken(): Promise<string | null>;

  // Plugin system
  plugin(name: string, plugin: Plugin): Promise<void>;

  // Low-level API access
  api: ApiClient;
}

/**
 * Plugin manifest from backend
 */
export interface PluginManifest {
  version: string;
  plugins: string[];
  oauth2_providers?: string[];
  [key: string]: any;
}
