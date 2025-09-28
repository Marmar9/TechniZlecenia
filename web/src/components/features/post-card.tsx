"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Clock, AlertCircle, Edit, Trash2, Star, ChevronDown, ChevronUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatRelativeTime, formatDeadline } from "@/lib/date-utils"
import { useRouter } from "next/navigation"
import { ReviewsList } from "./reviews-list"
import { ContactPostOwner } from "./contact-post-owner"
import { useAuth } from "@/contexts/auth-context"
import type { Post, User } from "@/types/api"

interface PostCardProps {
  post: Post
  showEditOptions?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function PostCard({ post, showEditOptions = false, onEdit, onDelete }: PostCardProps) {
  const { toast } = useToast()
  const router = useRouter()
  const { user, token } = useAuth()
  const [showReviews, setShowReviews] = useState(false)

  const handleEdit = () => {
    if (onEdit) {
      onEdit()
    }
  }

  const handleDelete = () => {
    if (confirm("Czy na pewno chcesz usunąć to ogłoszenie?")) {
      if (onDelete) {
        onDelete()
        toast({
          title: "Ogłoszenie usunięte",
          description: "Twoje ogłoszenie zostało usunięte z rynku.",
        })
      }
    }
  }

  const isOwnPost = post.owner_id === user?.id

  const handleViewProfile = () => {
    router.push(`/profile/${post.owner_id}`)
  }

  return (
    <Card
      className={`bg-card border-border hover:bg-accent/50 transition-colors cursor-pointer ${
        post.urgent ? "ring-2 ring-warning/50" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button 
              type="button"
              onClick={handleViewProfile}
              className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer"
            >
              {(post.owner_name || post.owner_username || "U")
                .split(" ")
                .map((n: string) => n[0])
                .join("")}
            </button>
            <div>
              <button 
                type="button"
                onClick={handleViewProfile}
                className="text-left hover:text-primary transition-colors"
              >
                <p className="text-sm font-medium text-card-foreground hover:text-primary">
                  {post.owner_name || post.owner_username || "Unknown User"}
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(post.createdAt)}</span>
                </div>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {post.urgent && (
              <Badge variant="outline" className="border-warning text-warning">
                <AlertCircle className="h-3 w-3 mr-1" />
                Pilne
              </Badge>
            )}
            <Badge
              variant={post.type === "request" ? "destructive" : "default"}
              className={post.type === "request" ? "bg-warning text-black" : "bg-success text-white"}
            >
              {post.type === "request" ? "Zapytanie" : "Oferta"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <h3 className="font-semibold text-card-foreground mb-2 text-balance">{post.title}</h3>
        <p className="text-sm text-muted-foreground mb-3 text-pretty">{post.description}</p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="bg-secondary px-2 py-1 rounded text-secondary-foreground">{post.subject}</span>
          {post.deadline && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDeadline(post.deadline)}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex items-center justify-between">
        <div className="flex items-center gap-1 text-lg font-semibold text-card-foreground">
          {post.price}
          <span className="text-sm">zł</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReviews(!showReviews)}
            className="flex items-center gap-1"
          >
            <Star className="h-4 w-4" />
            Recenzje
            {showReviews ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {!isOwnPost && (
            <ContactPostOwner
              post={post}
              currentUserId={user?.id}
              token={token}
            />
          )}
          
          {showEditOptions && isOwnPost && (
            <>
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edytuj
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive bg-transparent"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Usuń
              </Button>
            </>
          )}
        </div>
      </CardFooter>

      {showReviews && (
        <CardContent className="pt-0 border-t border-border">
          <ReviewsList
            targetId={post.id}
            reviewType="post"
            targetName={post.title}
            receiverId={post.owner_id}
            canAddReview={!isOwnPost}
            showStats={true}
          />
        </CardContent>
      )}
    </Card>
  )
}
