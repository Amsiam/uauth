/**
 * Universal Auth SDK - React Integration
 */

export { AuthProvider, useAuth } from './context';
export type { AuthContextValue, AuthProviderProps } from './context';

export { RequireAuth, GuestOnly, AuthGuard } from './components';
export type { RequireAuthProps, GuestOnlyProps, AuthGuardProps } from './components';

// OAuth2 exports
export {
  OAuth2Provider,
  useOAuth2,
  OAuthButton,
  OAuthButtons,
  OAuthCallback,
} from './oauth2';
export type {
  OAuth2ContextValue,
  OAuth2ProviderProps,
  OAuthButtonProps,
  OAuthButtonsProps,
  OAuthCallbackProps,
  OAuthButtonRenderProps,
} from './oauth2';

// Re-export types from core SDK for convenience
export type {
  User,
  UniversalAuth,
  AuthConfig,
  SignInData,
  SignUpPayload,
  ApiResponse,
  OAuth2Provider as OAuth2ProviderConfig,
  OAuth2FlowOptions,
} from 'universal-auth-sdk';
