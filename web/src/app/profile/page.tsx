"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"

export default function ProfileRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to user's own profile using their username/identifier
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("currentUser")
      if (userData) {
        try {
          const user = JSON.parse(userData)
          router.replace(`/profile/${user.id}`)
        } catch {
          router.push('/auth/login')
        }
      } else {
        router.push('/auth/login')
      }
    }
  }, [router])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Redirecting to your profile...</p>
        </div>
      </div>
    </div>
  )
}