import { createFileRoute } from '@tanstack/react-router'
import { validateSession } from '../server/functions'

export const Route = createFileRoute('/')({
  // Server-side loader for SSR
  loader: async ({ context }) => {
    // Validate session server-side
    const sessionStatus = await validateSession.fetch({ request: context.request })

    return {
      isAuthenticated: sessionStatus.isAuthenticated,
      userId: sessionStatus.userId,
    }
  },
  component: HomePage,
})

function HomePage() {
  const { isAuthenticated, userId } = Route.useLoaderData()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          TanStack Start Auth Example
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Demonstrating @nightmar3/uauth-start authentication
        </p>
        <p className="text-sm text-gray-500 mb-8">
          ✅ Fully server-side rendered with TanStack Start server functions
        </p>

        {isAuthenticated ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-green-900 mb-2">
              Welcome back!
            </h2>
            <p className="text-green-700 mb-1">
              You are successfully authenticated.
            </p>
            <p className="text-sm text-green-600">
              User ID: <code className="bg-green-100 px-2 py-1 rounded">{userId}</code>
            </p>
            <p className="text-xs text-green-600 mt-2">
              (Session validated server-side)
            </p>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-blue-900 mb-2">
              Get Started
            </h2>
            <p className="text-blue-700 mb-4">
              Sign in or create an account to access protected features.
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="/login"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Sign In
              </a>
              <a
                href="/signup"
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Sign Up
              </a>
            </div>
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">🔐 Secure</h3>
            <p className="text-gray-600">
              Token-based authentication with auto-refresh
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">⚡ Fast</h3>
            <p className="text-gray-600">
              Server-side rendering for instant page loads
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">🎯 Type-Safe</h3>
            <p className="text-gray-600">
              Full TypeScript support with server functions
            </p>
          </div>
        </div>

        {/* Server Functions Info */}
        <div className="mt-12 bg-purple-50 border border-purple-200 rounded-lg p-6 text-left">
          <h3 className="text-lg font-semibold text-purple-900 mb-3">
            🚀 Server Functions Used
          </h3>
          <p className="text-purple-700 text-sm mb-3">
            This page demonstrates TanStack Start server functions:
          </p>
          <ul className="text-sm text-purple-700 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <div>
                <code className="bg-purple-100 px-2 py-1 rounded">validateSession()</code>
                <span className="ml-2">- Server-side session validation</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <div>
                <span>All data rendered on the server before sending to browser</span>
              </div>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <div>
                <span>View page source to see fully rendered HTML!</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
