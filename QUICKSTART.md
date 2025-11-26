# Quick Start Guide

Get Universal Auth SDK running in 5 minutes!

## What You'll Build

A complete authentication system with:
- Sign up / Sign in
- Protected routes
- Automatic token refresh
- Session management

## Prerequisites

- Node.js 18+
- Python 3.10+ (for backend)

## Step 1: Start the Backend (2 minutes)

```bash
# Navigate to backend
cd backends/fastapi

# Install dependencies
pip install -r requirements.txt

# Configure
cp .env.example .env

# Start server
uvicorn main:app --reload
```

Backend running at `http://localhost:8000` ✅

Visit `http://localhost:8000/docs` to see API documentation.

## Step 2: Run the Example App (1 minute)

```bash
# Navigate to example
cd examples/react-vite

# Install dependencies
npm install

# Start dev server
npm run dev
```

App running at `http://localhost:5173` ✅

## Step 3: Try It Out (2 minutes)

1. Open `http://localhost:5173`
2. Click "Need an account? Sign up"
3. Create an account
4. You'll automatically be signed in!
5. Try the "Sign Out" and "Sign In" buttons

## Step 4: Use in Your Project

### Install

```bash
npm install universal-auth-sdk universal-auth-sdk-react
```

### Set Up (React)

```tsx
import { createAuth } from 'universal-auth-sdk'
import { AuthProvider, useAuth } from 'universal-auth-sdk-react'

// 1. Create auth instance
const auth = createAuth({
  baseURL: 'http://localhost:8000/auth'
})

// 2. Wrap your app
function App() {
  return (
    <AuthProvider auth={auth}>
      <YourApp />
    </AuthProvider>
  )
}

// 3. Use in components
function Profile() {
  const { user, signOut } = useAuth()

  return (
    <div>
      <h1>Welcome {user?.name}</h1>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

## Next Steps

### Build Your Own Backend

Choose your framework and implement 5 endpoints:

1. `POST /auth/sign-in/password` - Sign in
2. `POST /auth/sign-up` - Sign up
3. `POST /auth/token/refresh` - Refresh token
4. `GET /auth/session` - Get user
5. `DELETE /auth/session` - Sign out

See [Backend Guide](backends/fastapi/README.md) for details.

### Add to Next.js

```bash
npm install universal-auth-sdk-server
```

```tsx
// middleware.ts
import { createServerAuth } from 'universal-auth-sdk-server'

export async function middleware(request) {
  const auth = createServerAuth({
    baseURL: process.env.AUTH_API_URL!
  })

  const session = await auth.getSessionFromRequest(request)

  if (!session.ok) {
    return NextResponse.redirect('/login')
  }

  return NextResponse.next()
}
```

### Customize

- Style the UI
- Add OAuth providers
- Implement 2FA
- Add role-based access

## Common Issues

### Backend not starting?

```bash
# Make sure you're in the right directory
cd backends/fastapi

# Check Python version
python --version  # Should be 3.10+

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Frontend can't connect?

1. Check backend is running at `http://localhost:8000`
2. Check CORS settings in `backends/fastapi/config.py`
3. Open browser console for errors

### CORS errors?

Update `backends/fastapi/config.py`:

```python
cors_origins: list[str] = [
    "http://localhost:5173",  # Your frontend URL
    "http://localhost:3000"
]
```

## Learn More

- [📖 Full Documentation](README.md)
- [🔧 Core SDK API](packages/core/README.md)
- [⚛️ React Hooks](packages/react/README.md)
- [🖥️ Server Utilities](packages/server/README.md)
- [📝 Complete Spec](agen.md)

## Need Help?

- Open an issue on GitHub
- Check the [examples](examples/)
- Read the [contributing guide](CONTRIBUTING.md)

---

**You're ready to build! 🚀**
