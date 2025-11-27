'use client'

import { useAuth } from '@uauth/next'
import { useRouter } from 'next/navigation'

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter()
  const { signOut, isLoading } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className={className}
    >
      Sign Out
    </button>
  )
}
