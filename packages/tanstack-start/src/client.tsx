/**
 * Universal Auth SDK - TanStack Start Client Hooks
 *
 * Read-only hooks that consume server data from router context
 * All auth state comes from server via loaders - no client-side state manipulation
 */

'use client'

import { useRouter, useRouteContext } from '@tanstack/react-router'
import { 
  useState, 
  useEffect, 
  useCallback,
  type ReactNode
} from 'react'
import type { User, Session } from './types'
import { 
  signInFn, 
  signUpFn, 
  signOutFn, 
  getOAuthProvidersFn,
  getOAuthUrlFn,
  oauthSignInFn
} from './server'
import type { OAuth2Provider } from '@nightmar3/uauth-core'

export interface UseOAuthResult {
  /** Available OAuth providers */
  providers: OAuth2Provider[]
  /** Whether providers are loading */
  isLoading: boolean
  /** Sign in with OAuth provider (popup flow) */
  signInWithOAuth: (provider: string) => Promise<void>
}

/**
 * Hook for OAuth authentication
 * Uses server functions to proxy all auth server requests
 */
export function useOAuth(): UseOAuthResult {
  const [providers, setProviders] = useState<OAuth2Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Load providers from server
  useEffect(() => {
    const load = async () => {
      try {
        const list = await getOAuthProvidersFn()
        setProviders(list)
      } catch (e) {
        console.warn('Failed to load OAuth providers', e)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const signInWithOAuth = useCallback(async (provider: string) => {
    // 1. Get Auth URL from server
    const authUrl = await getOAuthUrlFn({ 
      data: { 
        provider,
        // Default redirect to current origin + /auth/callback if not specified
        // The core SDK will handle the callback parsing
        redirectUri: window.location.origin + '/auth/callback'
      } 
    })

    // 2. Open Popup
    const width = 500
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2
    
    const popup = window.open(
      authUrl,
      'OAuth2 Sign In',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no`
    )

    if (!popup) throw new Error('Popup blocked')

    // 3. Listen for callback message
    return new Promise<void>((resolve, reject) => {
      const handler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        
        const { code, error, error_description } = event.data
        
        // Check if it's an oauth message
        if (!code && !error) return

        window.removeEventListener('message', handler)
        popup.close()

        if (error) {
          reject(new Error(error_description || error))
          return
        }

        try {
          // 4. Exchange code for session via server
          const result = await oauthSignInFn({
            data: {
              provider,
              code,
              redirectUri: window.location.origin + '/auth/callback'
            }
          })

          if (result.ok) {
            router.invalidate()
            resolve()
          } else {
            reject(new Error(result.error?.message || 'OAuth sign in failed'))
          }
        } catch (e) {
          reject(e)
        }
      }

      window.addEventListener('message', handler)
    })
  }, [router])

  return { providers, isLoading, signInWithOAuth }
}

/**
 * Hook to access auth state from router context
 * All data is read-only and comes from server via loaders
 *
 * @example
 * ```tsx
 * function Profile() {
 *   const { user, isAuthenticated, signOut } = useAuth()
 *
 *   if (!isAuthenticated) {
 *     return <div>Please log in</div>
 *   }
 *
 *   return (
 *     <div>
 *       <p>Hello, {user.name}</p>
 *       <button onClick={signOut}>Sign Out</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAuth<U extends User = User>() {
  const router = useRouter()
  const context = useRouteContext({ from: '__root__' }) as { user: U | null; isAuthenticated: boolean }

  const user = context.user ?? null
  const isAuthenticated = context.isAuthenticated ?? false

  /**
   * Sign in with email and password
   * Calls server function, then invalidates router to refetch data
   */
  const signIn = async (email: string, password: string, extra?: Record<string, any>) => {
    const result = await signInFn({ data: { email, password, ...extra } })

    if (result.ok) {
      // Invalidate router to refetch user data from server
      router.invalidate()
    }

    return result
  }

  /**
   * Sign up with email and password
   * Calls server function, then invalidates router to refetch data
   */
  const signUp = async (data: any) => {
    const result = await signUpFn({ data })

    if (result.ok) {
      // Invalidate router to refetch user data from server
      router.invalidate()
    }

    return result
  }

  /**
   * Sign out
   * Calls server function, then invalidates router to refetch data
   */
  const signOut = async () => {
    console.log('Starting sign out...')
    try {
      const result = await signOutFn()
      console.log('Sign out server response:', result)
      
      // Use window.location for a clean page refresh
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  return {
    user,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
  }
}

/**
 * Get current user from router context
 * Read-only access to server-provided user data
 *
 * @example
 * ```tsx
 * function UserBadge() {
 *   const user = useUser()
 *   return <div>{user?.name ?? 'Guest'}</div>
 * }
 * ```
 */
export function useUser<U extends User = User>(): U | null {
  const { user } = useAuth<U>()
  return user
}

/**
 * Get current session from router context
 * Read-only access to server-provided session data
 *
 * @example
 * ```tsx
 * function SessionInfo() {
 *   const session = useSession()
 *   return <div>{session ? 'Logged in' : 'Not logged in'}</div>
 * }
 * ```
 */
export function useSession<U extends User = User>() {
  const { user, isAuthenticated } = useAuth<U>()

  if (!isAuthenticated || !user) {
    return null
  }

  return {
    user,
    isAuthenticated,
  }
}

/**
 * Render children only when authenticated
 * Reads auth state from router context (server-provided)
 *
 * @example
 * ```tsx
 * <SignedIn>
 *   <UserDashboard />
 * </SignedIn>
 * ```
 */
export function SignedIn({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : null
}

/**
 * Render children only when NOT authenticated
 * Reads auth state from router context (server-provided)
 *
 * @example
 * ```tsx
 * <SignedOut>
 *   <LoginPrompt />
 * </SignedOut>
 * ```
 */
export function SignedOut({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  return !isAuthenticated ? <>{children}</> : null
}

/**
 * Conditional rendering based on auth state
 * Reads from router context (server-provided)
 *
 * @example
 * ```tsx
 * <AuthGate
 *   fallback={<LoginPrompt />}
 *   loading={<Spinner />}
 * >
 *   <UserDashboard />
 * </AuthGate>
 * ```
 */
export function AuthGate({
  children,
  fallback,
  loading,
}: {
  children: ReactNode
  fallback?: ReactNode
  loading?: ReactNode
}) {
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  // Show loading state while router is loading
  if (router.state.isLoading && loading) {
    return <>{loading}</>
  }

  if (!isAuthenticated) {
    return <>{fallback ?? null}</>
  }

  return <>{children}</>
}
