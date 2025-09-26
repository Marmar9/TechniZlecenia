"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"

export function UserProfile() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  const userName = user.name || user.username || 'User'
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('') || 'U'

  return (
    <Link href={`/profile/${user.id}`}>
      <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-accent p-0">
        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium transition-colors">
          {userInitials}
        </div>
        <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-success rounded-full border-2 border-background" />
      </Button>
    </Link>
  )
}