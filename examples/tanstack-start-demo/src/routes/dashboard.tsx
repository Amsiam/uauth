import { createFileRoute } from '@tanstack/react-router'
import { createAuthBeforeLoad, createAuthMiddleware } from '@nightmar3/uauth-tanstack-start/middleware'
import { useAuth, useUser } from '@nightmar3/uauth-tanstack-start/client'
import { createServerFn } from '@tanstack/react-start'

// Protected server function
const getSecretData = createServerFn({ method: 'GET' })
  .middleware([createAuthMiddleware()])
  .handler(async ({ context }) => {
    return {
      message: `Hello ${context.user?.email}! This is secret data from the server.`,
      timestamp: new Date().toISOString(),
    }
  })

export const Route = createFileRoute('/dashboard')({
  beforeLoad: createAuthBeforeLoad({
    redirectTo: '/login',
  }),
  component: Dashboard,
  loader: async () => {
    const data = await getSecretData()
    return { secretData: data }
  },
})

function Dashboard() {
  const user = useUser()
  const { signOut } = useAuth()
  const { secretData } = Route.useLoaderData()

  const handleSignOut = async () => {
    try {
      await signOut()
      // Router will automatically invalidate and redirect
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Welcome!</h2>
          <p className="text-gray-700">
            <strong>Email:</strong> {user?.email}
          </p>
          <p className="text-gray-700">
            <strong>User ID:</strong> {user?.id}
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Server Data</h2>
          <p className="text-gray-700 mb-2">{secretData.message}</p>
          <p className="text-sm text-gray-500">Fetched at: {secretData.timestamp}</p>
        </div>

        <button
          onClick={handleSignOut}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
