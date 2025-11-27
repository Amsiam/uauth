'use client'

import { AuthProvider } from '@uauth/next'

/**
 * App providers wrapper
 *
 * With @uauth/next, you just need to wrap your app with AuthProvider.
 * Everything else (OAuth2, cookie storage, SSR safety) is handled automatically.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Cast to any to avoid React 18/19 type mismatch
  return <AuthProvider>{children as any}</AuthProvider>
}
