import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import type {
  UniversalAuth,
  User,
  ApiResponse,
  SignInData,
  OAuth2Provider,
  OAuth2FlowOptions,
} from 'universal-auth-sdk';
import { useAuth } from './context';

/**
 * OAuth2 context value
 */
export interface OAuth2ContextValue {
  providers: OAuth2Provider[];
  isLoading: boolean;
  error: Error | null;
  loadProviders: () => Promise<OAuth2Provider[]>;
  signInWithPopup: <U extends User = User>(
    options: OAuth2FlowOptions
  ) => Promise<ApiResponse<SignInData<U>>>;
  signInWithRedirect: (options: OAuth2FlowOptions) => Promise<void>;
  handleCallback: <U extends User = User>() => Promise<ApiResponse<SignInData<U>>>;
}

const OAuth2Context = createContext<OAuth2ContextValue | null>(null);

export interface OAuth2ProviderProps {
  auth: UniversalAuth;
  children: ReactNode;
  loadOnMount?: boolean;
}

/**
 * OAuth2 Provider component - provides OAuth2 functionality to children
 */
export function OAuth2Provider({
  auth,
  children,
  loadOnMount = true,
}: OAuth2ProviderProps) {
  const [providers, setProviders] = useState<OAuth2Provider[]>([]);
  const [isLoading, setIsLoading] = useState(loadOnMount);
  const [error, setError] = useState<Error | null>(null);

  // Get oauth2 from auth SDK
  const oauth2 = (auth as any).oauth2;

  // Load providers
  const loadProviders = useCallback(async () => {
    if (!oauth2) {
      throw new Error('OAuth2 plugin not installed. Call auth.plugin("oauth2", createOAuth2Plugin()) first.');
    }

    setIsLoading(true);
    setError(null);

    try {
      const loadedProviders = await oauth2.loadProviders();
      setProviders(loadedProviders);
      return loadedProviders;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load providers');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [oauth2]);

  // Load on mount
  useEffect(() => {
    if (loadOnMount && oauth2) {
      // Check if providers are already loaded
      const existingProviders = oauth2.getProviders?.();
      if (existingProviders?.length > 0) {
        setProviders(existingProviders);
        setIsLoading(false);
      } else {
        loadProviders().catch(() => {
          // Error already set in loadProviders
        });
      }
    } else {
      setIsLoading(false);
    }
  }, [loadOnMount, oauth2, loadProviders]);

  // Sign in with popup
  const signInWithPopup = useCallback(
    async <U extends User = User>(options: OAuth2FlowOptions) => {
      if (!oauth2) {
        return {
          ok: false,
          data: null,
          error: {
            code: 'PLUGIN_NOT_INSTALLED',
            message: 'OAuth2 plugin not installed',
          },
        } as ApiResponse<SignInData<U>>;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await oauth2.signInWithPopup<U>(options);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Sign in failed');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [oauth2]
  );

  // Sign in with redirect
  const signInWithRedirect = useCallback(
    async (options: OAuth2FlowOptions) => {
      if (!oauth2) {
        throw new Error('OAuth2 plugin not installed');
      }

      setError(null);

      try {
        await oauth2.signInWithRedirect(options);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Redirect failed');
        setError(error);
        throw error;
      }
    },
    [oauth2]
  );

  // Handle callback
  const handleCallback = useCallback(
    async <U extends User = User>() => {
      if (!oauth2) {
        return {
          ok: false,
          data: null,
          error: {
            code: 'PLUGIN_NOT_INSTALLED',
            message: 'OAuth2 plugin not installed',
          },
        } as ApiResponse<SignInData<U>>;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await oauth2.handleCallback<U>();
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Callback handling failed');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [oauth2]
  );

  const value: OAuth2ContextValue = {
    providers,
    isLoading,
    error,
    loadProviders,
    signInWithPopup,
    signInWithRedirect,
    handleCallback,
  };

  return (
    <OAuth2Context.Provider value={value}>{children}</OAuth2Context.Provider>
  );
}

/**
 * Hook to access OAuth2 functionality
 */
export function useOAuth2(): OAuth2ContextValue {
  const context = useContext(OAuth2Context);

  if (!context) {
    throw new Error('useOAuth2 must be used within an OAuth2Provider');
  }

  return context;
}

/**
 * Render prop arguments for OAuthButton
 */
export interface OAuthButtonRenderProps {
  /** Whether authentication is in progress */
  isLoading: boolean;
  /** Whether the button is disabled */
  isDisabled: boolean;
  /** The provider configuration (if loaded) */
  provider: OAuth2Provider | undefined;
  /** Display name of the provider */
  displayName: string;
  /** Click handler to trigger OAuth flow */
  onClick: () => void;
}

/**
 * Props for OAuth2 button components
 */
export interface OAuthButtonProps {
  provider: string;
  /**
   * Button content - can be:
   * - ReactNode for simple customization
   * - Render function for full control: (props: OAuthButtonRenderProps) => ReactNode
   */
  children?: ReactNode | ((props: OAuthButtonRenderProps) => ReactNode);
  className?: string;
  disabled?: boolean;
  useRedirect?: boolean;
  redirectUri?: string;
  onSuccess?: <U extends User = User>(data: SignInData<U>) => void;
  onError?: (error: Error) => void;
}

/**
 * OAuth2 Sign In Button - renders a button for a specific OAuth2 provider
 *
 * @example Simple usage
 * ```tsx
 * <OAuthButton provider="google" onSuccess={handleSuccess} />
 * ```
 *
 * @example With custom text
 * ```tsx
 * <OAuthButton provider="google">Continue with Google</OAuthButton>
 * ```
 *
 * @example With render prop for full customization
 * ```tsx
 * <OAuthButton provider="google" onSuccess={handleSuccess}>
 *   {({ isLoading, onClick, displayName }) => (
 *     <MyCustomButton onClick={onClick} loading={isLoading}>
 *       <GoogleIcon /> Sign in with {displayName}
 *     </MyCustomButton>
 *   )}
 * </OAuthButton>
 * ```
 */
export function OAuthButton({
  provider,
  children,
  className,
  disabled,
  useRedirect = false,
  redirectUri,
  onSuccess,
  onError,
}: OAuthButtonProps) {
  const { providers, isLoading, signInWithPopup, signInWithRedirect } = useOAuth2();
  const { setUser } = useAuth();
  const [localLoading, setLocalLoading] = useState(false);

  const providerConfig = providers.find((p) => p.name === provider);
  const displayName = providerConfig?.displayName || provider;
  const isDisabled = disabled || isLoading || localLoading || !providerConfig;

  const handleClick = async () => {
    if (isDisabled) return;

    setLocalLoading(true);

    try {
      if (useRedirect) {
        await signInWithRedirect({ provider, redirectUri });
      } else {
        const result = await signInWithPopup({ provider, redirectUri });

        if (result.ok && result.data) {
          // Directly set user from OAuth response - this updates React state immediately
          setUser(result.data.user);
          onSuccess?.(result.data);
        } else if (result.error && result.error.code !== 'POPUP_CLOSED') {
          onError?.(new Error(result.error.message));
        }
      }
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('OAuth sign in failed'));
    } finally {
      setLocalLoading(false);
    }
  };

  // Render prop pattern - full customization
  if (typeof children === 'function') {
    return (
      <>
        {children({
          isLoading: localLoading,
          isDisabled,
          provider: providerConfig,
          displayName,
          onClick: handleClick,
        })}
      </>
    );
  }

  // Default button rendering
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={className}
      aria-busy={localLoading}
    >
      {localLoading ? 'Signing in...' : children || `Sign in with ${displayName}`}
    </button>
  );
}

/**
 * Props for OAuth2 buttons container
 */
export interface OAuthButtonsProps {
  className?: string;
  buttonClassName?: string;
  useRedirect?: boolean;
  redirectUri?: string;
  onSuccess?: <U extends User = User>(data: SignInData<U>) => void;
  onError?: (error: Error) => void;
  /**
   * Custom render function for each button
   * @example
   * ```tsx
   * <OAuthButtons
   *   renderButton={(props) => (
   *     <button onClick={props.onClick} disabled={props.isDisabled}>
   *       {props.isLoading ? 'Loading...' : props.displayName}
   *     </button>
   *   )}
   * />
   * ```
   */
  renderButton?: (props: OAuthButtonRenderProps) => ReactNode;
}

/**
 * OAuth2 Buttons - renders buttons for all available OAuth2 providers
 *
 * @example Simple usage - renders default buttons for all providers
 * ```tsx
 * <OAuthButtons onSuccess={handleSuccess} onError={handleError} />
 * ```
 *
 * @example Custom rendering for each button
 * ```tsx
 * <OAuthButtons
 *   onSuccess={handleSuccess}
 *   renderButton={({ onClick, isLoading, displayName, isDisabled }) => (
 *     <MyButton onClick={onClick} loading={isLoading} disabled={isDisabled}>
 *       Sign in with {displayName}
 *     </MyButton>
 *   )}
 * />
 * ```
 */
export function OAuthButtons({
  className,
  buttonClassName,
  useRedirect = false,
  redirectUri,
  onSuccess,
  onError,
  renderButton,
}: OAuthButtonsProps) {
  const { providers, isLoading } = useOAuth2();

  if (isLoading) {
    return <div className={className}>Loading providers...</div>;
  }

  if (providers.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {providers.map((provider) => (
        <OAuthButton
          key={provider.name}
          provider={provider.name}
          className={buttonClassName}
          useRedirect={useRedirect}
          redirectUri={redirectUri}
          onSuccess={onSuccess}
          onError={onError}
        >
          {renderButton || undefined}
        </OAuthButton>
      ))}
    </div>
  );
}

/**
 * Props for OAuth2 callback handler
 */
export interface OAuthCallbackProps {
  onSuccess?: <U extends User = User>(data: SignInData<U>) => void;
  onError?: (error: Error) => void;
  loadingComponent?: ReactNode;
  errorComponent?: (error: Error) => ReactNode;
  children?: ReactNode;
}

/**
 * OAuth2 Callback Handler - handles the OAuth2 callback automatically
 */
export function OAuthCallback({
  onSuccess,
  onError,
  loadingComponent = <div>Completing sign in...</div>,
  errorComponent,
  children,
}: OAuthCallbackProps) {
  const { handleCallback } = useOAuth2();
  const { setUser } = useAuth();
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const result = await handleCallback();

        if (result.ok && result.data) {
          // Directly set user from OAuth response
          setUser(result.data.user);
          setSuccess(true);
          onSuccess?.(result.data);
        } else if (result.error) {
          // POPUP_FLOW means the popup handled it, not an error
          if (result.error.code === 'POPUP_FLOW') {
            return;
          }
          const err = new Error(result.error.message);
          setError(err);
          onError?.(err);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Callback failed');
        setError(error);
        onError?.(error);
      }
    };

    processCallback();
  }, [handleCallback, setUser, onSuccess, onError]);

  if (error) {
    return <>{errorComponent ? errorComponent(error) : <div>Error: {error.message}</div>}</>;
  }

  if (success && children) {
    return <>{children}</>;
  }

  return <>{loadingComponent}</>;
}
