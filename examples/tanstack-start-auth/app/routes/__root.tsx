import { AuthProvider } from '@nightmar3/uauth-start'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Navigation } from '../components/Navigation'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Outlet />
        </main>
      </div>
    </AuthProvider>
  )
}
