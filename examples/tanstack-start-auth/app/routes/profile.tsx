import { getSession } from '@nightmar3/uauth-start/server'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { getUserActivity, getUserStats } from '../server/functions'

export const Route = createFileRoute('/profile')({
  // Server-side loader - fully SSR
  loader: async ({ context }) => {
    const session = await getSession(context.request)

    if (!session) {
      throw redirect({ to: '/login' })
    }

    // Fetch all profile data server-side in parallel
    const [stats, activity] = await Promise.all([
      getUserStats.fetch({ request: context.request }),
      getUserActivity.fetch({ request: context.request }),
    ])

    return {
      user: session.user,
      stats,
      activity: activity || [],
    }
  },
  component: ProfilePage,
})

function ProfilePage() {
  const { user, stats, activity } = Route.useLoaderData()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Profile
        </h1>

        {/* User Header - Server-rendered */}
        <div className="flex items-center space-x-6 mb-8 pb-6 border-b border-gray-200">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold">{user.name || 'User'}</h2>
            <p className="text-gray-600">{user.email}</p>
            {stats && (
              <div className="mt-2 flex gap-4 text-sm text-gray-500">
                <span>👤 Member for {stats.accountAge} days</span>
                <span>🔐 {stats.loginCount} logins</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid - Server-rendered */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-900">{stats.loginCount}</div>
              <div className="text-sm text-blue-700">Total Logins</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">{stats.accountAge}</div>
              <div className="text-sm text-green-700">Days Active</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-900">{stats.activeProjects}</div>
              <div className="text-sm text-purple-700">Active Projects</div>
            </div>
          </div>
        )}

        {/* Account Details - Server-rendered */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Account Details</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <dt className="text-sm font-medium text-gray-600 mb-1">User ID</dt>
              <dd className="font-mono text-sm bg-white p-2 rounded border border-gray-200">
                {user.id}
              </dd>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <dt className="text-sm font-medium text-gray-600 mb-1">Email Address</dt>
              <dd className="text-sm">{user.email}</dd>
            </div>
            {user.name && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <dt className="text-sm font-medium text-gray-600 mb-1">Display Name</dt>
                <dd className="text-sm">{user.name}</dd>
              </div>
            )}
            {stats && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <dt className="text-sm font-medium text-gray-600 mb-1">Last Login</dt>
                <dd className="text-sm">{new Date(stats.lastLogin).toLocaleString()}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Activity Log - Server-rendered */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          {activity.length > 0 ? (
            <div className="space-y-3">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-sm">{item.action}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No recent activity</p>
          )}
        </div>

        {/* Authentication Status - Server-rendered */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Authentication Status</h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg
                className="w-6 h-6 text-green-600 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <div className="text-green-900 font-medium">Authenticated and Active</div>
                <div className="text-green-700 text-sm">Session validated server-side</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SSR Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          ✅ Fully Server-Side Rendered
        </h3>
        <p className="text-green-700 text-sm mb-3">
          All profile data is fetched server-side using these server functions:
        </p>
        <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
          <li><code className="bg-green-100 px-1 rounded">getSession()</code> - User authentication</li>
          <li><code className="bg-green-100 px-1 rounded">getUserStats()</code> - User statistics</li>
          <li><code className="bg-green-100 px-1 rounded">getUserActivity()</code> - Activity history</li>
        </ul>
        <p className="text-green-700 text-sm mt-3">
          Data is fetched in parallel for optimal performance!
        </p>
      </div>
    </div>
  )
}
