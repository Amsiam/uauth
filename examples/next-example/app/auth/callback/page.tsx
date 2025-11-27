'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@uauth/next'

/**
 * OAuth callback page
 *
 * This page handles the OAuth redirect from providers like Google/GitHub.
 * The @uauth/next package handles the token exchange automatically
 * through the AuthProvider's OAuth2 plugin.
 */
export default function CallbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CallbackContent />
    </Suspense>
  )
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-100 mx-auto mb-4" />
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    </div>
  )
}

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoading, user } = useAuth()

  // Compute error state from URL params immediately (not in effect)
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const error = errorParam ? (errorDescription || errorParam) : null
  const code = searchParams.get('code')

  useEffect(() => {
    // If user is already authenticated, redirect to dashboard
    if (user) {
      router.replace('/dashboard')
    }
  }, [user, router])

  // Show error if present in URL
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Authentication Failed
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  // Show error if no code received
  if (!isLoading && !code && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Authentication Failed
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">No authorization code received</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  // Show loading spinner while processing
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-100 mx-auto mb-4" />
        <p className="text-zinc-600 dark:text-zinc-400">
          Completing sign in...
        </p>
      </div>
    </div>
  )
}
