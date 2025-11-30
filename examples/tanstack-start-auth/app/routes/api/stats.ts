import { createAPIFileRoute } from '@tanstack/start/api'
import { getUserStats } from '../../server/functions'

/**
 * API Route: GET /api/stats
 * Returns user statistics as JSON
 * Demonstrates using server functions in API routes
 */
export const Route = createAPIFileRoute('/api/stats')({
  GET: async ({ request }) => {
    const stats = await getUserStats.fetch({ request })

    if (!stats) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data: stats,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  },
})
