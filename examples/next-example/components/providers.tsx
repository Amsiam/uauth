'use client'

import { AuthProvider, createOAuth2Plugin } from '@uauth/next'

// Create plugins once outside component to avoid re-creation
const plugins = [createOAuth2Plugin()]

/**
 * App providers wrapper
 *
 * With @uauth/next, you just need to wrap your app with AuthProvider.
 * Pass plugins for additional features like OAuth2.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider plugins={plugins}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {children as any}
    </AuthProvider>
  )
}
