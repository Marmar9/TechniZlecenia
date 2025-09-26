"use client"

import { useAuth } from '@/contexts/auth-context'
import { usePathname } from "next/navigation"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoading, isAuthenticated } = useAuth()
  const pathname = usePathname()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (pathname?.startsWith('/auth/')) {
    return <>{children}</>
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}






