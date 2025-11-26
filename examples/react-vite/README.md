# Universal Auth SDK - React + Vite Example

A complete example application demonstrating the Universal Auth SDK with React and Vite.

## Features

- ✅ Sign up / Sign in forms
- ✅ Protected dashboard
- ✅ Automatic token refresh
- ✅ Loading states
- ✅ Error handling
- ✅ Session management

## Quick Start

### 1. Start the Backend

First, make sure the FastAPI backend is running:

```bash
cd ../../backends/fastapi
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

The backend should be running at `http://localhost:8000`

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Development Server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

## Usage

### Sign Up

1. Click "Need an account? Sign up"
2. Enter name, email, and password
3. Click "Sign Up"
4. You'll be automatically signed in

### Sign In

1. Enter your email and password
2. Click "Sign In"
3. You'll be redirected to the dashboard

### Dashboard

Once signed in, you'll see:
- Your user information (name, email, ID)
- Refresh token button
- Sign out button

## Code Structure

```
src/
├── main.tsx       # Entry point
├── App.tsx        # Main app with auth logic
├── App.css        # Styles
└── index.css      # Global styles
```

## Key Concepts Demonstrated

### Creating Auth Instance

```typescript
const auth = createAuth({
  baseURL: 'http://localhost:8000/auth',
  storage: localStorage
})
```

### Using Auth Provider

```typescript
<AuthProvider auth={auth}>
  <YourApp />
</AuthProvider>
```

### Using useAuth Hook

```typescript
const { user, isLoading, signIn, signUp, signOut } = useAuth()
```

### Protected Content

```typescript
<RequireAuth fallback={<LoginPage />}>
  <Dashboard />
</RequireAuth>
```

## Customization

You can modify this example to:

- Add more form fields
- Implement password reset
- Add role-based access control
- Style with your preferred CSS framework
- Add routing with React Router

## Learn More

- [Core SDK Documentation](../../packages/core/README.md)
- [React Hooks Documentation](../../packages/react/README.md)
- [Full Specification](../../agen.md)
