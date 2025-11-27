import Link from "next/link"
import { getSession } from "@uauth/next/server"

export default async function Home() {
  const session = await getSession()
  const user = session?.user

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <main className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
          Universal Auth SDK
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8">
          Next.js 16 Example with @uauth packages
        </p>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Authentication Status
          </h2>

          {user ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-zinc-900 dark:text-zinc-100">
                  Signed in as <strong>{user.email}</strong>
                </span>
              </div>
              <Link
                href="/dashboard"
                className="inline-block px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-zinc-600 dark:text-zinc-400">
                You are not signed in
              </p>
              <Link
                href="/login"
                className="inline-block px-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 text-left">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            @uauth/next
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Zero-config authentication for Next.js. Just wrap your app with AuthProvider
            and you get: cookie-based sessions, OAuth2 support, middleware protection,
            and server component integration.
          </p>
          <ul className="text-sm text-zinc-500 dark:text-zinc-400 space-y-1">
            <li>- Auto-configured cookie storage</li>
            <li>- Built-in OAuth2 support</li>
            <li>- Route protection middleware</li>
            <li>- Server Component helpers</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
