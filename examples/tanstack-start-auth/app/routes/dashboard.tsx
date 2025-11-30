import { useAuth } from '@nightmar3/uauth-start'
import { getSession } from '@nightmar3/uauth-start/server'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { getDashboardData } from '../server/functions'

export const Route = createFileRoute('/dashboard')({
  // Server-side loader - runs on the server for SSR
  loader: async ({ context }) => {
    const session = await getSession(context.request)

    if (!session) {
      throw redirect({ to: '/login' })
    }

    // Fetch all dashboard data server-side
    const dashboardData = await getDashboardData.fetch({ request: context.request })

    return {
      user: session.user,
      dashboardData,
    }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { user, dashboardData } = Route.useLoaderData()
  const { refreshSession } = useAuth()

  const handleRefresh = async () => {
    await refreshSession()
    alert('Session refreshed!')
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Dashboard
        </h1>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">
            Welcome back, {user.name || user.email}!
          </h2>
          <p className="text-blue-700">
            All data on this page is fetched server-side for optimal performance and SEO.
          </p>
        </div>

        {/* Stats Grid - Server-rendered */}
        {dashboardData?.stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow">
              <div className="text-3xl font-bold mb-1">{dashboardData.stats.loginCount}</div>
              <div className="text-blue-100">Total Logins</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow">
              <div className="text-3xl font-bold mb-1">{dashboardData.stats.accountAge}</div>
              <div className="text-green-100">Days Active</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow">
              <div className="text-3xl font-bold mb-1">{dashboardData.stats.activeProjects}</div>
              <div className="text-purple-100">Active Projects</div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow">
              <div className="text-3xl font-bold mb-1">100%</div>
              <div className="text-orange-100">Server Rendered</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* User Information - Server-rendered */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">User Information</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-600">User ID</dt>
                <dd className="font-mono text-sm bg-gray-50 p-2 rounded mt-1">{user.id}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Email</dt>
                <dd className="text-sm mt-1">{user.email}</dd>
              </div>
              {user.name && (
                <div>
                  <dt className="text-sm text-gray-600">Name</dt>
                  <dd className="text-sm mt-1">{user.name}</dd>
                </div>
              )}
              {dashboardData?.stats && (
                <div>
                  <dt className="text-sm text-gray-600">Last Login</dt>
                  <dd className="text-sm mt-1">
                    {new Date(dashboardData.stats.lastLogin).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Recent Activity - Server-rendered */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{activity.action}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
          </div>
        </div>

        {/* Notifications - Server-rendered */}
        {dashboardData?.notifications && dashboardData.notifications.length > 0 && (
          <div className="border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Notifications</h3>
            <div className="space-y-2">
              {dashboardData.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg"
                >
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  <span className="text-sm">{notification.message}</span>
                  {!notification.read && (
                    <span className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session Management */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Session Management</h3>
          <p className="text-sm text-gray-600 mb-4">
            Your session is automatically refreshed before it expires. All data above was fetched server-side.
          </p>
          <div className="flex gap-4">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh Session Manually
            </button>
            <a
              href="/profile"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              View Profile →
            </a>
          </div>
        </div>
      </div>

      {/* Server-Side Rendering Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          ✅ Fully Server-Side Rendered
        </h3>
        <p className="text-green-700 text-sm mb-3">
          This entire page is rendered on the server with data fetched using TanStack Start server functions:
        </p>
        <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
          <li><code className="bg-green-100 px-1 rounded">getDashboardData()</code> - Combined dashboard data</li>
          <li><code className="bg-green-100 px-1 rounded">getUserStats()</code> - User statistics</li>
          <li><code className="bg-green-100 px-1 rounded">getUserActivity()</code> - Activity log</li>
          <li><code className="bg-green-100 px-1 rounded">getSession()</code> - Authentication check</li>
        </ul>
        <p className="text-green-700 text-sm mt-3">
          View page source to see the fully rendered HTML!
        </p>
      </div>
    </div>
  )
}
