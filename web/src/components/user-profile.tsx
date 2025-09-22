"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { User as UserType } from "@/types/api"

export function UserProfile() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('auth_token')
    const userData = localStorage.getItem('currentUser')
    
    if (!token || !userData) {
      router.push('/auth/login')
      return
    }

    try {
      const user: UserType = JSON.parse(userData)
      
      
      // If user has old ID format (like "1"), clear localStorage and redirect to login
      if (user.id === "1" || user.id === "" || !user.id || user.id.length < 10) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('currentUser')
        router.push('/auth/login')
        return
      }
      
      setCurrentUser(user)
    } catch {
      router.push('/auth/login')
    }
  }, [router])

  if (!currentUser) {
    return null
  }

  const userName = currentUser.name || currentUser.username || 'User'
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('') || 'U'

  return (
    <Link href={`/profile/${currentUser.id}`}>
      <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-accent p-0">
        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium transition-colors">
          {userInitials}
        </div>
        <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-success rounded-full border-2 border-background" />
      </Button>
    </Link>
  )
}