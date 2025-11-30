# TanStack Start Authentication Example

A complete example application demonstrating authentication with `@nightmar3/uauth-start`.

## Features

- ✅ **Fully Server-Side Rendered (SSR)** - All pages rendered on the server
- ✅ **TanStack Start Server Functions** - Extensive use of server functions for data fetching
- ✅ Email/password authentication
- ✅ Protected routes with server-side session validation
- ✅ Auto token refresh
- ✅ Client-side and server-side auth state
- ✅ API routes with authentication
- ✅ Parallel data fetching for optimal performance
- ✅ Responsive UI with Tailwind CSS
- ✅ TypeScript support

## Server-Side Rendering (SSR)

This example is **fully server-side rendered**. Every page fetches data on the server before sending HTML to the browser:

### Server Functions Used

**Data Fetching:**
- `getCurrentUser()` - Get current authenticated user
- `getUserStats()` - Fetch user statistics
- `getUserActivity()` - Get user activity log
- `getDashboardData()` - Combined dashboard data (parallel fetching)
- `validateSession()` - Quick session validation

**Server Actions:**
- `loginAction()` - Handle login form submission
- `signupAction()` - Handle signup form submission
- `logoutAction()` - Handle logout

**API Routes:**
- `/api/user` - Get user data as JSON
- `/api/stats` - Get user statistics as JSON

### SSR Benefits

1. **SEO Friendly** - Fully rendered HTML for search engines
2. **Fast Initial Load** - No client-side data fetching waterfall
3. **Secure** - Authentication checked on server before rendering
4. **Type-Safe** - Full TypeScript support across client/server boundary

## Project Structure

```
app/
├── routes/
│   ├── __root.tsx        # Root route with AuthProvider
│   ├── index.tsx         # Home page
│   ├── login.tsx         # Login page
│   ├── signup.tsx        # Signup page
│   ├── dashboard.tsx     # Protected dashboard
│   └── profile.tsx       # Protected profile page
├── components/
│   └── Navigation.tsx    # Navigation component
├── client.tsx            # Client entry point
├── server.tsx            # Server entry point
├── router.tsx            # Router configuration
└── routeTree.gen.ts      # Route tree (auto-generated)
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update the `VITE_AUTH_URL` to point to your authentication backend:

```env
VITE_AUTH_URL=http://localhost:8000/auth
```

### 3. Start the Backend

Make sure your authentication backend is running. For the FastAPI example:

```bash
cd ../../backends/fastapi
pip install -r requirements.txt
uvicorn main:app --reload
```

### 4. Start the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Usage

### Authentication Flow

1. **Sign Up**: Navigate to `/signup` to create a new account
2. **Sign In**: Navigate to `/login` to sign in with existing credentials
3. **Protected Routes**: Access `/dashboard` and `/profile` (requires authentication)
4. **Sign Out**: Click the "Sign Out" button in the navigation

### Key Features Demonstrated

#### Client-Side Authentication

```tsx
import { useAuth } from '@nightmar3/uauth-start'

function Component() {
  const { user, signIn, signOut } = useAuth()
  // ...
}
```

#### Server-Side Session Validation

```tsx
import { getSession } from '@nightmar3/uauth-start/server'

export const Route = createFileRoute('/dashboard')({
  loader: async ({ context }) => {
    const session = await getSession(context.request)
    if (!session) throw redirect({ to: '/login' })
    return { user: session.user }
  }
})
```

#### Conditional Rendering

```tsx
import { SignedIn, SignedOut } from '@nightmar3/uauth-start'

<SignedIn>
  <UserMenu />
</SignedIn>
<SignedOut>
  <LoginButton />
</SignedOut>
```

### Server Functions

#### Creating Server Functions

```tsx
// app/server/functions.ts
import { createServerFn } from '@tanstack/start'
import { getUser } from '@nightmar3/uauth-start/server'

export const getUserData = createServerFn('GET', async (_, { request }) => {
  const user = await getUser(request)
  if (!user) return null
  
  // Fetch additional data from your database
  return {
    user,
    stats: await fetchUserStats(user.id),
  }
})
```

#### Using Server Functions in Routes

```tsx
// app/routes/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router'
import { getUserData } from '../server/functions'

export const Route = createFileRoute('/dashboard')({
  loader: async ({ context }) => {
    // Fetches data on the server
    const data = await getUserData.fetch({ request: context.request })
    return { data }
  },
  component: () => {
    const { data } = Route.useLoaderData()
    return <div>Welcome {data.user.name}</div>
  }
})
```

#### Server Actions for Forms

```tsx
// app/server/actions.ts
import { createServerFn } from '@tanstack/start'

export const updateProfile = createServerFn('POST', async (data: { name: string }, { request }) => {
  const user = await getUser(request)
  if (!user) throw new Error('Unauthorized')
  
  // Update in database
  await db.users.update(user.id, { name: data.name })
  
  return { success: true }
})
```

#### API Routes

```tsx
// app/routes/api/user.ts
import { createAPIFileRoute } from '@tanstack/start/api'
import { getUser } from '@nightmar3/uauth-start/server'

export const Route = createAPIFileRoute('/api/user')({
  GET: async ({ request }) => {
    const user = await getUser(request)
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    return new Response(JSON.stringify({ data: user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  },
})
```

## Routes

| Route | Description | Protected |
|-------|-------------|-----------|
| `/` | Home page | No |
| `/login` | Login page | No |
| `/signup` | Signup page | No |
| `/dashboard` | User dashboard | Yes |
| `/profile` | User profile | Yes |

## Building for Production

```bash
npm run build
npm start
```

## Learn More

- [TanStack Start Documentation](https://tanstack.com/start)
- [TanStack Router Documentation](https://tanstack.com/router)
- [@nightmar3/uauth-start Package](../../packages/start/README.md)
- [Universal Auth SDK](../../README.md)

## License

MIT
