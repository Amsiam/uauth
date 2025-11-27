import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@uauth/next/server'
import { SignOutButton } from '@/components/sign-out-button'

export default async function DashboardPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {user.email}
            </span>
            <SignOutButton className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
            Welcome, {user.name || user.email}!
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                User Information
              </h3>
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">ID</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                    {user.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Email</span>
                  <span className="text-zinc-900 dark:text-zinc-100">
                    {user.email}
                  </span>
                </div>
                {user.name && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Name</span>
                    <span className="text-zinc-900 dark:text-zinc-100">
                      {user.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                Quick Actions
              </h3>
              <div className="flex gap-4">
                <Link
                  href="/"
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Go to Home
                </Link>
                <SignOutButton className="px-4 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
