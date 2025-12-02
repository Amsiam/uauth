import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  Link,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import Header from '../components/Header'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'
import type { User } from '@nightmar3/uauth-core'
import { getSessionFn } from '@nightmar3/uauth-tanstack-start/server'

interface MyRouterContext {
  queryClient: QueryClient
  session: Awaited<ReturnType<typeof getSessionFn>>
  user: User | null
  isAuthenticated: boolean
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Auth Demo',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  beforeLoad: async () => {
    const session = await getSessionFn()
    return { 
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session?.user
    }
  },

  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <div className="container mx-auto p-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-lg shadow-lg p-12">
          <h1 className="text-9xl font-bold text-gray-300 mb-4">404</h1>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Page Not Found</h2>
          <p className="text-gray-600 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Go Home
            </Link>
            <Link
              to="/login"
              className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
