/**
 * Universal Auth SDK - React Integration
 */

export { AuthProvider, useAuth } from './context';
export type { AuthContextValue, AuthProviderProps } from './context';

export { RequireAuth, GuestOnly, AuthGuard } from './components';
export type { RequireAuthProps, GuestOnlyProps, AuthGuardProps } from './components';

// Re-export types from core SDK for convenience
export type {
  User,
  UniversalAuth,
  AuthConfig,
  SignInData,
  SignUpPayload,
  ApiResponse,
} from 'universal-auth-sdk';
