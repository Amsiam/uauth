import type {
  AuthConfig,
  UniversalAuth,
  SignInData,
  SignUpPayload,
  SessionData,
  RefreshData,
  ApiResponse,
  Plugin,
  PluginContext,
  PasswordSignInPayload,
  OAuth2SignInPayload,
  MagicLinkPayload,
  User,
} from './types';
import { ApiClient } from './client';

export class UniversalAuthSDK<U extends User = User> implements UniversalAuth<U> {
  public api: ApiClient;
  private plugins: Map<string, Plugin> = new Map();

  constructor(config: AuthConfig) {
    this.api = new ApiClient(config);
  }

  /**
   * Sign in with various methods
   */
  async signIn(
    method: 'password',
    payload: PasswordSignInPayload
  ): Promise<ApiResponse<SignInData<U>>>;
  async signIn(
    method: 'oauth2',
    payload: OAuth2SignInPayload
  ): Promise<ApiResponse<SignInData<U>>>;
  async signIn(
    method: 'magic-link',
    payload: MagicLinkPayload
  ): Promise<ApiResponse<SignInData<U>>>;
  async signIn(
    method: string,
    payload: any
  ): Promise<ApiResponse<SignInData<U>>> {
    const endpoint = `/sign-in/${method}`;
    const result = await this.api.req<SignInData<U>>(endpoint, payload, {
      skipAuth: true,
    });

    // Store tokens if sign-in was successful
    if (result.ok && result.data?.tokens) {
      await this.api.setTokens(result.data.tokens);
    }

    return result;
  }

  /**
   * Sign up a new user
   */
  async signUp(payload: SignUpPayload): Promise<ApiResponse<SignInData<U>>> {
    const result = await this.api.req<SignInData<U>>('/sign-up', payload, {
      skipAuth: true,
    });

    // Store tokens if sign-up was successful
    if (result.ok && result.data?.tokens) {
      await this.api.setTokens(result.data.tokens);
    }

    return result;
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<ApiResponse<{ ok: boolean }>> {
    const result = await this.api.req<{ ok: boolean }>('/session', null, {
      method: 'DELETE',
    });

    // Clear tokens regardless of response
    await this.api.clearTokens();

    return result;
  }

  /**
   * Get current session
   */
  async session(): Promise<ApiResponse<SessionData<U>>> {
    return this.api.req<SessionData<U>>('/session');
  }

  /**
   * Refresh access token
   */
  async refresh(): Promise<ApiResponse<RefreshData>> {
    return this.api.refresh();
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.api.getAccessToken();
    if (!token) return false;

    // Check if token is expired
    const isExpired = await this.api.isTokenExpired();
    if (isExpired) {
      // Try to refresh
      const refreshResult = await this.refresh();
      return refreshResult.ok;
    }

    return true;
  }

  /**
   * Get current access token
   */
  async getToken(): Promise<string | null> {
    return this.api.getAccessToken();
  }

  /**
   * Install a plugin
   */
  async plugin(name: string, plugin: Plugin): Promise<void> {
    if (this.plugins.has(name)) {
      console.warn(`Plugin "${name}" is already installed`);
      return;
    }

    const context: PluginContext = {
      client: this.api,
      core: {
        getToken: () => this.getToken(),
        setTokens: (tokens) => this.api.setTokens(tokens),
        clearTokens: () => this.api.clearTokens(),
        refresh: () => this.refresh(),
      },
      sdk: this as any,
    };

    await plugin.install(context);
    this.plugins.set(name, plugin);
  }
}
