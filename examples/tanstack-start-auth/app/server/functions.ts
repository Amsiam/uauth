import { getSession, getUser } from '@nightmar3/uauth-start/server'
import { createServerFn } from '@tanstack/start'

/**
 * Server function to get current user session
 * This runs on the server and returns user data
 */
export const getCurrentUser = createServerFn('GET', async (_, { request }) => {
  const session = await getSession(request)
  return session?.user || null
})

/**
 * Server function to get user statistics
 * Demonstrates fetching additional data server-side
 */
export const getUserStats = createServerFn('GET', async (_, { request }) => {
  const user = await getUser(request)
  
  if (!user) {
    return null
  }

  // Simulate fetching user stats from database
  return {
    userId: user.id,
    loginCount: Math.floor(Math.random() * 100) + 1,
    lastLogin: new Date().toISOString(),
    accountAge: Math.floor(Math.random() * 365) + 1,
    activeProjects: Math.floor(Math.random() * 10),
  }
})

/**
 * Server function to get user activity log
 * Demonstrates server-side data fetching with authentication
 */
export const getUserActivity = createServerFn('GET', async (_, { request }) => {
  const user = await getUser(request)
  
  if (!user) {
    return []
  }

  // Simulate fetching activity log from database
  const activities = [
    { id: 1, action: 'Logged in', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: 2, action: 'Updated profile', timestamp: new Date(Date.now() - 7200000).toISOString() },
    { id: 3, action: 'Changed password', timestamp: new Date(Date.now() - 86400000).toISOString() },
  ]

  return activities
})

/**
 * Server function to update user profile
 * Demonstrates server-side mutations
 */
export const updateUserProfile = createServerFn('POST', async (data: { name: string }, { request }) => {
  const user = await getUser(request)
  
  if (!user) {
    throw new Error('Unauthorized')
  }

  // Simulate updating user profile in database
  console.log('Updating user profile:', { userId: user.id, name: data.name })

  return {
    success: true,
    message: 'Profile updated successfully',
    user: {
      ...user,
      name: data.name,
    },
  }
})

/**
 * Server function to get dashboard data
 * Demonstrates combining multiple data sources
 */
export const getDashboardData = createServerFn('GET', async (_, { request }) => {
  const user = await getUser(request)
  
  if (!user) {
    return null
  }

  // Simulate fetching dashboard data from multiple sources
  const [stats, activity] = await Promise.all([
    getUserStats.fetch({ request }),
    getUserActivity.fetch({ request }),
  ])

  return {
    user,
    stats,
    recentActivity: activity?.slice(0, 3) || [],
    notifications: [
      { id: 1, message: 'Welcome to your dashboard!', read: false },
      { id: 2, message: 'Your profile is 80% complete', read: false },
    ],
  }
})

/**
 * Server function to validate session
 * Quick check without fetching full user data
 */
export const validateSession = createServerFn('GET', async (_, { request }) => {
  const session = await getSession(request)
  return {
    isAuthenticated: !!session,
    userId: session?.user?.id || null,
  }
})
