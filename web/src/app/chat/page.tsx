'use client'

import { useEffect, useState } from 'react'
import { ChatInterface } from '@/components/features/chat-interface'
import { useAuth } from '@/contexts/auth-context'
import { AuthGuard } from '@/components/layout/auth-guard'

export default function ChatPage() {
  const { user, token } = useAuth()

  return (
    <AuthGuard>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">
            Chat with other users about posts and projects
          </p>
        </div>
        
        <ChatInterface 
          token={token} 
          currentUserId={user?.id}
        />
      </div>
    </AuthGuard>
  )
}

