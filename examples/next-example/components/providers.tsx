'use client'

import { AuthProvider, createOAuth2Plugin } from '@uauth/next'

/**
 * App providers wrapper
 *
 * Basic usage (email/password only):
 *   <AuthProvider>{children}</AuthProvider>
 *
 * With OAuth (optional):
 *   <AuthProvider plugins={[createOAuth2Plugin()]}>{children}</AuthProvider>
 */

// OAuth plugin - remove this line if you don't need OAuth
const plugins = [createOAuth2Plugin()]

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Remove `plugins` prop if you only need email/password auth
    <AuthProvider plugins={plugins}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {children as any}
    </AuthProvider>
  )
}
