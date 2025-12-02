import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallback,
})

function AuthCallback() {
  useEffect(() => {
    // Get params from URL
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')
    const error_description = params.get('error_description')

    console.log('Auth callback loaded', { code, error })

    if (window.opener) {
      console.log('Sending message to opener')
      // Send message to opener
      window.opener.postMessage(
        {
          type: 'oauth2_callback',
          code,
          error,
          error_description,
        },
        window.location.origin
      )
      
      // Attempt to close window from here as well
      setTimeout(() => {
        window.close()
      }, 100)
    } else {
      console.error('No opener window found')
    }
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Authenticating...</h2>
        <p className="text-gray-600">Please wait while we complete the sign in process.</p>
      </div>
    </div>
  )
}
