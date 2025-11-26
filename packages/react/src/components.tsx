import React, { ReactNode } from 'react';
import { useAuth } from './context';
import type { User } from 'universal-auth-sdk';

export interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

/**
 * Component that only renders children if user is authenticated
 */
export function RequireAuth({
  children,
  fallback = null,
  loadingFallback = null,
}: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export interface GuestOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

/**
 * Component that only renders children if user is NOT authenticated
 */
export function GuestOnly({
  children,
  fallback = null,
  loadingFallback = null,
}: GuestOnlyProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export interface AuthGuardProps<U extends User = User> {
  children: ReactNode | ((user: U) => ReactNode);
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  check?: (user: U) => boolean;
}

/**
 * Advanced auth guard with custom check function
 */
export function AuthGuard<U extends User = User>({
  children,
  fallback = null,
  loadingFallback = null,
  check,
}: AuthGuardProps<U>) {
  const { user, isLoading } = useAuth<U>();

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (!user) {
    return <>{fallback}</>;
  }

  // Custom check function
  if (check && !check(user)) {
    return <>{fallback}</>;
  }

  // If children is a function, call it with user
  if (typeof children === 'function') {
    return <>{children(user)}</>;
  }

  return <>{children}</>;
}
