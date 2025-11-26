import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import type {
  UniversalAuth,
  User,
  SignInData,
  SignUpPayload,
  ApiResponse,
  SessionData,
} from 'universal-auth-sdk';

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
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  auth: UniversalAuth;
  children: ReactNode;
  loadOnMount?: boolean;
}

export function AuthProvider<U extends User = User>({
  auth,
  children,
  loadOnMount = true,
}: AuthProviderProps) {
  const [user, setUser] = useState<U | null>(null);
  const [isLoading, setIsLoading] = useState(loadOnMount);
  const [error, setError] = useState<Error | null>(null);

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
        } else {
          setUser(null);
          if (result.error) {
            setError(new Error(result.error.message));
          }
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load session'));
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [auth]);

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
    [auth]
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
    [auth]
  );

  // Sign out
  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await auth.signOut();
      setUser(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign out failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [auth]);

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

  const value: AuthContextValue<U> = {
    user: user as U,
    isLoading,
    isAuthenticated: user !== null,
    error,
    signIn,
    signUp,
    signOut,
    refresh,
    refetch: loadSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth<U extends User = User>(): AuthContextValue<U> {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context as AuthContextValue<U>;
}
