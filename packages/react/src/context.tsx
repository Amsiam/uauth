import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import type {
  UniversalAuth,
  User,
  SignInData,
  SignUpPayload,
  ApiResponse,
  SessionData,
  Plugin,
} from '@nightmar3/uauth-core';

export interface AuthContextValue<U extends User = User> {
  user: U | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  signIn: (
    method: string,
    payload: any
  ) => Promise<ApiResponse<SignInData<U>>>;
  signUp: (payload: SignUpPayload) => Promise<ApiResponse<SignInData<U>>>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  refetch: () => Promise<void>;
  setUser: (user: U | null) => void;
  /** Get an installed plugin by name */
  getPlugin: <T extends Plugin>(name: string) => T | null;
  /** Whether plugins are installed and ready */
  pluginsReady: boolean;
  /** The auth instance */
  auth: UniversalAuth;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Track installed plugins
const installedPlugins = new Map<string, Plugin>();

export interface AuthProviderProps {
  auth: UniversalAuth;
  children: ReactNode;
  /**
   * Plugins to install (e.g., OAuth2)
   * @example
   * ```tsx
   * import { createOAuth2Plugin } from '@uauth/core'
   * <AuthProvider auth={auth} plugins={[createOAuth2Plugin()]}>
   * ```
   */
  plugins?: Plugin[];
  loadOnMount?: boolean;
  /**
   * Enable automatic token refresh before expiry
   * When enabled, tokens will be refreshed automatically before they expire
   * @default true
   */
  autoRefresh?: boolean;
  /**
   * How many seconds before expiry to refresh the token
   * @default 60 (1 minute before expiry)
   */
  refreshBeforeExpiry?: number;
}

export function AuthProvider<U extends User = User>({
  auth,
  children,
  plugins = [],
  loadOnMount = true,
  autoRefresh = true,
  refreshBeforeExpiry = 60,
}: AuthProviderProps) {
  const [user, setUser] = useState<U | null>(null);
  const [isLoading, setIsLoading] = useState(loadOnMount);
  const [error, setError] = useState<Error | null>(null);
  const [pluginsReady, setPluginsReady] = useState(plugins.length === 0);
  const pluginsInstalled = useRef(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get plugin helper
  const getPlugin = useCallback(<T extends Plugin>(name: string): T | null => {
    return (installedPlugins.get(name) as T) || null;
  }, []);

  // Clear any existing refresh timeout
  const clearRefreshTimeout = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  // Schedule auto-refresh based on token expiry time
  const scheduleAutoRefresh = useCallback(async () => {
    if (!autoRefresh) return;

    clearRefreshTimeout();

    try {
      const expiresAt = await auth.api.getTokenExpiresAt();
      if (!expiresAt) return;

      const now = Date.now();
      const refreshAt = expiresAt - (refreshBeforeExpiry * 1000);
      const delay = refreshAt - now;

      // Only schedule if token expires in the future
      if (delay > 0) {
        refreshTimeoutRef.current = setTimeout(async () => {
          try {
            const result = await auth.refresh();
            if (result.ok) {
              // Schedule next refresh after successful refresh
              scheduleAutoRefresh();
            }
          } catch {
            // Refresh failed, will be handled on next request
          }
        }, delay);
      } else if (delay > -refreshBeforeExpiry * 1000) {
        // Token is about to expire or just expired, refresh immediately
        try {
          const result = await auth.refresh();
          if (result.ok) {
            scheduleAutoRefresh();
          }
        } catch {
          // Refresh failed
        }
      }
    } catch {
      // Failed to get expiry time
    }
  }, [auth, autoRefresh, refreshBeforeExpiry, clearRefreshTimeout]);

  // Load session on mount
  const loadSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const isAuth = await auth.isAuthenticated();

      if (isAuth) {
        const result = await auth.session();
        if (result.ok && result.data) {
          setUser(result.data.user as U);
          // Schedule auto-refresh when session is loaded
          scheduleAutoRefresh();
        } else {
          setUser(null);
          clearRefreshTimeout();
          if (result.error) {
            setError(new Error(result.error.message));
          }
        }
      } else {
        setUser(null);
        clearRefreshTimeout();
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load session'));
      setUser(null);
      clearRefreshTimeout();
    } finally {
      setIsLoading(false);
    }
  }, [auth, scheduleAutoRefresh, clearRefreshTimeout]);

  // Install plugins on mount
  useEffect(() => {
    const installPlugins = async () => {
      if (!pluginsInstalled.current && plugins.length > 0) {
        for (const plugin of plugins) {
          if (!installedPlugins.has(plugin.name)) {
            await auth.plugin(plugin.name, plugin);
            installedPlugins.set(plugin.name, plugin);
          }
        }
        pluginsInstalled.current = true;
        setPluginsReady(true);
      } else if (plugins.length === 0) {
        setPluginsReady(true);
      }
    };

    installPlugins();
  }, [auth, plugins]);

  // Load session on mount
  useEffect(() => {
    if (loadOnMount) {
      loadSession();
    } else {
      setIsLoading(false);
    }
  }, [loadOnMount, loadSession]);

  // Sign in
  const signIn = useCallback(
    async (method: string, payload: any) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await auth.signIn(method, payload);

        if (result.ok && result.data) {
          setUser(result.data.user as U);
          // Schedule auto-refresh after successful sign-in
          scheduleAutoRefresh();
        } else if (result.error) {
          setError(new Error(result.error.message));
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Sign in failed');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [auth, scheduleAutoRefresh]
  );

  // Sign up
  const signUp = useCallback(
    async (payload: SignUpPayload) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await auth.signUp(payload);

        if (result.ok && result.data) {
          setUser(result.data.user as U);
          // Schedule auto-refresh after successful sign-up
          scheduleAutoRefresh();
        } else if (result.error) {
          setError(new Error(result.error.message));
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Sign up failed');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [auth, scheduleAutoRefresh]
  );

  // Sign out
  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await auth.signOut();
      setUser(null);
      // Clear auto-refresh on sign out
      clearRefreshTimeout();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign out failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [auth, clearRefreshTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      clearRefreshTimeout();
    };
  }, [clearRefreshTimeout]);

  // Refresh token
  const refresh = useCallback(async () => {
    try {
      await auth.refresh();
      await loadSession();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Refresh failed');
      setError(error);
      throw error;
    }
  }, [auth, loadSession]);

  const value = {
    user: user as U,
    isLoading,
    isAuthenticated: user !== null,
    error,
    signIn: signIn as AuthContextValue<U>['signIn'],
    signUp: signUp as AuthContextValue<U>['signUp'],
    signOut,
    refresh,
    refetch: loadSession,
    setUser: setUser as (user: U | null) => void,
    getPlugin,
    pluginsReady,
    auth,
  } satisfies AuthContextValue<U>;

  return <AuthContext.Provider value={value as AuthContextValue}>{children}</AuthContext.Provider>;
}

export function useAuth<U extends User = User>(): AuthContextValue<U> {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context as unknown as AuthContextValue<U>;
}

// Re-export Plugin type for convenience
export type { Plugin } from '@nightmar3/uauth-core';
