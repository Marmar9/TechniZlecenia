'use client'

import { useState } from 'react'
import { useChat } from '@/hooks/use-chat'
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
  const { createThread } = useChat({ token })
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
      createThread(post.id, post.owner_id)
      
      toast({
        title: "Chat Started",
        description: `Started conversation with ${post.owner_name}`,
      })
    } catch (error) {
      console.error('Failed to create chat thread:', error)
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
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

