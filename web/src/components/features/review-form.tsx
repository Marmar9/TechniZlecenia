"use client"

import { useState } from "react"
import { StarRating } from "@/components/ui/star-rating"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { CreateReviewRequest } from "@/types/api"
import { reviewsAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ReviewFormProps {
  reviewType: 'post' | 'profile'
  targetId: string
  targetName: string
  receiverId?: string // User ID of the person being reviewed
  onReviewCreated?: () => void
  onCancel?: () => void
  className?: string
}

export function ReviewForm({
  reviewType,
  targetId,
  targetName,
  receiverId,
  onReviewCreated,
  onCancel,
  className
}: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (rating === 0) {
      toast({
        title: "Błąd",
        description: "Wybierz ocenę przed wysłaniem recenzji.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const reviewData: CreateReviewRequest = {
        review_receiver_id: receiverId || targetId, // Use receiverId if provided, otherwise fallback to targetId
        score: rating,
        comment: comment.trim() || undefined,
        review_type: reviewType,
        ...(reviewType === 'post' 
          ? { post_id: targetId } 
          : { profile_id: targetId }
        )
      }

      await reviewsAPI.createReview(reviewData)
      
      toast({
        title: "Recenzja dodana",
        description: "Twoja recenzja została pomyślnie dodana.",
      })

      onReviewCreated?.()
    } catch (error: unknown) {
      console.error('Failed to create review:', error)
      
      let errorMessage = "Nie udało się dodać recenzji. Spróbuj ponownie."
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: string } }
        if (axiosError.response?.status === 409) {
          errorMessage = "Już dodałeś recenzję dla tego elementu."
        } else if (axiosError.response?.status === 400) {
          errorMessage = axiosError.response.data || errorMessage
        }
      }

      toast({
        title: "Błąd",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setRating(0)
    setComment("")
    onCancel?.()
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label>
          Oceń {reviewType === 'post' ? 'ogłoszenie' : 'profil'} "{targetName}"
        </Label>
        <div className="flex items-center space-x-2">
          <StarRating
            rating={rating}
            interactive
            onRatingChange={setRating}
            size="lg"
          />
          <span className="text-sm text-muted-foreground">
            {rating > 0 ? `${rating}/5` : "Wybierz ocenę"}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>
          Komentarz (opcjonalny)
        </Label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={`Napisz recenzję dla ${reviewType === 'post' ? 'tego ogłoszenia' : 'tego profilu'}...`}
          rows={3}
          maxLength={500}
          className="resize-none"
        />
        <div className="text-xs text-muted-foreground text-right">
          {comment.length}/500 znaków
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Anuluj
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || rating === 0}
        >
          {isSubmitting ? "Dodawanie..." : "Dodaj recenzję"}
        </Button>
      </div>
    </form>
  )
}
