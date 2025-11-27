/**
 * Universal Auth SDK - React Integration
 */

export { AuthProvider, useAuth } from './context';
export type { AuthContextValue, AuthProviderProps, Plugin } from './context';

export { RequireAuth, GuestOnly, AuthGuard } from './components';
export type { RequireAuthProps, GuestOnlyProps, AuthGuardProps } from './components';

// OAuth hook (new plugin-based approach)
export { useOAuth } from './useOAuth';
export type { UseOAuthResult } from './useOAuth';

// Re-export createOAuth2Plugin for convenience
export { createOAuth2Plugin } from '@nightmar3/uauth-core';

// Legacy OAuth2 exports (still works but prefer useOAuth with plugins)
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
} from '@nightmar3/uauth-core';
