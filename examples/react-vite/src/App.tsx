import { useState } from 'react'
import { createAuth } from 'universal-auth-sdk'
import { AuthProvider, useAuth, RequireAuth } from 'universal-auth-sdk-react'
import './App.css'

// Create auth instance
const auth = createAuth({
  baseURL: 'http://localhost:8000/auth',
  storage: localStorage,
  onAuthError: (error) => {
    console.error('Auth error:', error)
  }
})

function LoginForm() {
  const { signIn, isLoading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await signIn('password', { email, password })

    if (result.ok) {
      console.log('Logged in!', result.data.user)
    }
  }

  return (
    <div className="auth-form">
      <h2>Sign In</h2>
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

    if (result.ok) {
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
    <AuthProvider auth={auth}>
      <div className="app">
        <AppContent />
      </div>
    </AuthProvider>
  )
}

export default App
