import { useState, useEffect, useCallback } from 'react';
import type { OAuth2Provider, OAuth2Plugin } from '@uauth/core';
import { useAuth } from './context';

export interface UseOAuthResult {
  /** Available OAuth providers */
  providers: OAuth2Provider[];
  /** Whether providers are loading */
  isLoading: boolean;
  /** Sign in with OAuth provider (popup flow) */
  signInWithOAuth: (provider: string) => Promise<void>;
}

/**
 * Hook for OAuth authentication
 * Only works when OAuth2 plugin is installed via AuthProvider's plugins prop
 *
 * @example
 * ```tsx
 * import { createAuth, createOAuth2Plugin } from '@uauth/core'
 * import { AuthProvider, useOAuth } from '@uauth/react'
 *
 * const auth = createAuth({ baseURL: '...' })
 * const plugins = [createOAuth2Plugin()]
 *
 * function App() {
 *   return (
 *     <AuthProvider auth={auth} plugins={plugins}>
 *       <LoginPage />
 *     </AuthProvider>
 *   )
 * }
 *
 * function LoginPage() {
 *   const { providers, isLoading, signInWithOAuth } = useOAuth()
 *
 *   if (isLoading) return <div>Loading...</div>
 *
 *   return (
 *     <div>
 *       {providers.map(p => (
 *         <button key={p.name} onClick={() => signInWithOAuth(p.name)}>
 *           Sign in with {p.displayName}
 *         </button>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useOAuth(): UseOAuthResult {
  const { getPlugin, pluginsReady, setUser } = useAuth();
  const [providers, setProviders] = useState<OAuth2Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait for plugins to be installed
    if (!pluginsReady) {
      return;
    }

    const loadProviders = async () => {
      const plugin = getPlugin<OAuth2Plugin>('oauth2');
      if (plugin) {
        try {
          const loadedProviders = await plugin.loadProviders();
          setProviders(loadedProviders);
        } catch {
          // OAuth not configured on backend - that's ok
        }
      }
      setIsLoading(false);
    };

    loadProviders();
  }, [getPlugin, pluginsReady]);

  const signInWithOAuth = useCallback(async (provider: string) => {
    const plugin = getPlugin<OAuth2Plugin>('oauth2');
    if (!plugin) {
      throw new Error('OAuth2 plugin not installed. Add createOAuth2Plugin() to AuthProvider plugins.');
    }

    const result = await plugin.signInWithPopup({ provider });
    if (result.ok && result.data) {
      setUser(result.data.user);
    } else if (result.error) {
      throw new Error(result.error.message || 'OAuth sign in failed');
    }
  }, [getPlugin, setUser]);

  return { providers, isLoading, signInWithOAuth };
}
