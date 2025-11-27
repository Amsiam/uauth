import { useState } from 'react'
import { createAuth, createOAuth2Plugin } from '@uauth/core'
import {
  AuthProvider,
  useAuth,
  useOAuth,
  RequireAuth,
} from '@uauth/react'
import './App.css'

// Create auth instance
const auth = createAuth({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/auth',
  storage: localStorage,
  onAuthError: (error) => {
    console.error('Auth error:', error)
  }
})

/**
 * Plugins configuration
 *
 * Basic usage (email/password only):
 *   const plugins: never[] = []
 *
 * With OAuth (optional):
 *   const plugins = [createOAuth2Plugin()]
 */
const plugins = [createOAuth2Plugin()]

// SVG icons for OAuth providers
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: 8 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" style={{ marginRight: 8 }}>
    <path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
)

const providerIcons: Record<string, () => JSX.Element> = {
  google: GoogleIcon,
  github: GitHubIcon,
}

function OAuthSection() {
  const { providers, isLoading, signInWithOAuth } = useOAuth()
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState<string | null>(null)

  if (isLoading) {
    return <div className="oauth-section">Loading providers...</div>
  }

  if (providers.length === 0) {
    return null // No OAuth providers configured
  }

  const handleOAuthClick = async (providerName: string) => {
    setSigningIn(providerName)
    setOauthError(null)
    try {
      await signInWithOAuth(providerName)
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : 'OAuth sign in failed')
    } finally {
      setSigningIn(null)
    }
  }

  return (
    <div className="oauth-section">
      <p className="oauth-label">Sign in with</p>
      <div className="oauth-buttons">
        {providers.map((provider) => {
          const Icon = providerIcons[provider.name.toLowerCase()]
          const isSigningIn = signingIn === provider.name

          return (
            <button
              key={provider.name}
              onClick={() => handleOAuthClick(provider.name)}
              disabled={signingIn !== null}
              className="oauth-button"
              aria-busy={isSigningIn}
            >
              {Icon && <Icon />}
              {isSigningIn ? 'Signing in...' : `Continue with ${provider.displayName || provider.name}`}
            </button>
          )
        })}
      </div>
      {oauthError && <div className="error">{oauthError}</div>}
      <div className="divider">or continue with email</div>
    </div>
  )
}

function LoginForm() {
  const { signIn, isLoading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await signIn('password', { email, password })

    if (result.ok) {
      console.log('Logged in!', result.data?.user)
    }
  }

  return (
    <div className="auth-form">
      <h2>Sign In</h2>

      <OAuthSection />

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      {error && <div className="error">{error.message}</div>}
    </div>
  )
}

function SignUpForm() {
  const { signUp, isLoading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await signUp({ email, password, name })

    if (result.ok && result.data) {
      console.log('Account created!', result.data.user)
    }
  }

  return (
    <div className="auth-form">
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
      {error && <div className="error">{error.message}</div>}
    </div>
  )
}

function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  return (
    <div className="auth-page">
      <h1>Universal Auth SDK Demo</h1>
      <p>This demo uses a local FastAPI backend at localhost:8000</p>

      {mode === 'login' ? <LoginForm /> : <SignUpForm />}

      <button
        className="switch-mode"
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
      >
        {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
      </button>
    </div>
  )
}

function Dashboard() {
  const { user, signOut, refresh } = useAuth()

  return (
    <div className="dashboard">
      <h1>Welcome, {user?.name}!</h1>
      <div className="user-info">
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>ID:</strong> {user?.id}</p>
      </div>

      <div className="actions">
        <button onClick={refresh}>Refresh Token</button>
        <button onClick={signOut} className="danger">Sign Out</button>
      </div>
    </div>
  )
}

function AppContent() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <RequireAuth fallback={<AuthPage />}>
      <Dashboard />
    </RequireAuth>
  )
}

function App() {
  return (
    // Pass plugins prop to enable OAuth - remove it for email/password only
    <AuthProvider auth={auth} plugins={plugins}>
      <div className="app">
        <AppContent />
      </div>
    </AuthProvider>
  )
}

export default App
