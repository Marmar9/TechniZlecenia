"use client"

import { useState } from "react"
import { StarRating } from "@/components/ui/star-rating"
import { Button } from "@/components/ui/button"
import { Trash2, User } from "lucide-react"
import type { Review } from "@/types/api"
import { useAuth } from "@/contexts/auth-context"
import { reviewsAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import { pl } from "date-fns/locale"

interface ReviewCardProps {
  review: Review
  onDelete?: (reviewId: string) => void
  showDeleteButton?: boolean
  className?: string
}

export function ReviewCard({ 
  review, 
  onDelete, 
  showDeleteButton = false,
  className 
}: ReviewCardProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)

  const canDelete = user?.id === review.review_sender_id && showDeleteButton

  const handleDelete = async () => {
    if (!canDelete) return

    setIsDeleting(true)
    try {
      await reviewsAPI.deleteReview(review.id)
      onDelete?.(review.id)
      toast({
        title: "Recenzja usunięta",
        description: "Twoja recenzja została usunięta.",
      })
    } catch (error) {
      console.error('Failed to delete review:', error)
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć recenzji. Spróbuj ponownie.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: pl 
      })
    } catch {
      return "nieznana data"
    }
  }

  return (
    <div className={`bg-card border border-border rounded-lg p-4 space-y-3 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">
              {review.sender_name || review.sender_username || "Anonimowy użytkownik"}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(review.created_at)}
            </p>
          </div>
        </div>
        
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <StarRating rating={review.score} size="sm" />
        <span className="text-sm text-muted-foreground">
          {review.score}/5
        </span>
      </div>

      {review.comment && (
        <p className="text-sm text-foreground leading-relaxed">
          {review.comment}
        </p>
      )}

      <div className="text-xs text-muted-foreground">
        {review.review_type === 'post' ? 'Recenzja ogłoszenia' : 'Recenzja profilu'}
      </div>
    </div>
  )
}
