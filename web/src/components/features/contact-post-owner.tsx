'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Post } from '@/types/api'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ContactPostOwnerProps {
  post: Post
  currentUserId?: string
  token?: string | null
}

export function ContactPostOwner({ post, currentUserId, token }: ContactPostOwnerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)

  // Don't show contact button for own posts
  if (post.owner_id === currentUserId) {
    return null
  }

  const handleContactOwner = async () => {
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please login to contact the post owner",
        variant: "destructive"
      })
      return
    }

    if (!currentUserId) {
      toast({
        title: "Error",
        description: "User information not available",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)

    try {
      // Defer thread creation to chat page where WebSocket is connected
      const payload = { postId: post.id, otherUserId: post.owner_id }
      try { localStorage.setItem('pendingChat', JSON.stringify(payload)) } catch (_e) {}

      toast({
        title: "Przechodzę do czatu",
        description: `Rozpoczynam rozmowę z ${post.owner_name}`,
      })

      router.push('/chat')
    } catch (error) {
      console.error('Failed to navigate to chat:', error)
      toast({
        title: "Error",
        description: "Failed to open chat. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Button 
      onClick={handleContactOwner}
      disabled={isCreating || !token}
      className="w-full sm:w-auto"
      variant="outline"
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      {isCreating ? "Starting Chat..." : "Contact Owner"}
    </Button>
  )
}

