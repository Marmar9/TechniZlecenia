"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      // Allow access to auth pages
      if (pathname?.startsWith('/auth/')) {
        setIsAuthenticated(true)
        setIsLoading(false)
        return
      }

      // Check if user is authenticated
      const token = localStorage.getItem('auth_token')
      const userData = localStorage.getItem('currentUser')

      if (!token || !userData) {
        router.push('/auth/login')
        setIsAuthenticated(false)
      } else {
        setIsAuthenticated(true)
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [pathname, router])

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

  if (!isAuthenticated && !pathname?.startsWith('/auth/')) {
    return null
  }

  return <>{children}</>
}
