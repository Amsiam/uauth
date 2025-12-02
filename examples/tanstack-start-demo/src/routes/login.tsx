import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth, useOAuth } from '@nightmar3/uauth-tanstack-start/client'

function OAuthSection() {
  const { providers, signInWithOAuth } = useOAuth()

  if (providers.length === 0) return null

  return (
    <div className="mb-6">
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <div className="space-y-3">
        {providers.map((provider) => (
          <button
            key={provider.name}
            onClick={async () => {
              try {
                await signInWithOAuth(provider.name)
                window.location.href = '/dashboard'
              } catch (e) {
                console.error('OAuth sign in failed', e)
              }
            }}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {/* Simple icons based on provider name */}
            {provider.name === 'google' && (
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {provider.name === 'github' && (
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            Sign in with {provider.displayName}
          </button>
        ))}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/login')({
  component: Login,
})

function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      let result
      if (mode === 'signin') {
        console.log('Attempting sign in with:', { email, password: '***' })
        result = await signIn(email, password)
        console.log('Sign in result:', result)
      } else {
        console.log('Attempting sign up with:', { email, name, password: '***' })
        result = await signUp({ email, password, name })
        console.log('Sign up result:', result)
      }
      
      if (result.ok) {
        console.log('Authentication successful, redirecting...')
        window.location.href = '/dashboard'
      } else {
        console.error('Authentication failed:', result.error)
        // Extract the most detailed error message available
        const errorMessage = 
          result.error?.message || 
          (result.error as any)?.error?.message ||
          (result.error as any)?.details ||
          'Authentication failed. Please check your credentials.'
        setError(errorMessage)
      }
    } catch (e: any) {
      console.error('Exception during authentication:', e)
      const errorMessage = 
        e.message || 
        e.error?.message ||
        e.toString() ||
        'An unexpected error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-md p-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
          >
            {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <OAuthSection />

        <div className="text-center">
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-blue-600 hover:underline text-sm"
          >
            {mode === 'signin' ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-gray-600 hover:text-gray-800 text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
