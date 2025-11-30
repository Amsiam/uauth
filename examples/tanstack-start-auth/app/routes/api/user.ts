import { getUser } from '@nightmar3/uauth-start/server'
import { createAPIFileRoute } from '@tanstack/start/api'

/**
 * API Route: GET /api/user
 * Returns current user data as JSON
 * Demonstrates server-side API routes with authentication
 */
export const Route = createAPIFileRoute('/api/user')({
  GET: async ({ request }) => {
    const user = await getUser(request)

    if (!user) {
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
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  },
})
