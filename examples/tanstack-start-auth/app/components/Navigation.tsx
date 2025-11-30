import { SignedIn, SignedOut, useAuth } from '@nightmar3/uauth-start'
import { useNavigate } from '@tanstack/react-router'

export function Navigation() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate({ to: '/' })
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <a href="/" className="text-xl font-bold text-gray-900">
              🔐 Auth Demo
            </a>
            <div className="hidden md:flex space-x-4">
              <a
                href="/"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </a>
              <SignedIn>
                <a
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </a>
                <a
                  href="/profile"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Profile
                </a>
              </SignedIn>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <SignedOut>
              <a
                href="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign In
              </a>
              <a
                href="/signup"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Sign Up
              </a>
            </SignedOut>

            <SignedIn>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  {user?.name || user?.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm font-medium"
                >
                  Sign Out
                </button>
              </div>
            </SignedIn>
          </div>
        </div>
      </div>
    </nav>
  )
}
