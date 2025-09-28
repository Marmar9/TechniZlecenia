"use client"

import { useState, useEffect, useCallback } from "react"
import { ReviewCard } from "./review-card"
import { ReviewForm } from "./review-form"
import { ReviewStatsComponent } from "./review-stats"
import { Button } from "@/components/ui/button"
import { Plus, Star } from "lucide-react"
import type { Review, ReviewStats } from "@/types/api"
import { reviewsAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface ReviewsListProps {
  targetId: string
  reviewType: 'post' | 'profile'
  targetName: string
  receiverId?: string // User ID of the person being reviewed (required for post reviews)
  canAddReview?: boolean
  showStats?: boolean
  className?: string
}

export function ReviewsList({
  targetId,
  reviewType,
  targetName,
  receiverId,
  canAddReview = true,
  showStats = true,
  className
}: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const { toast } = useToast()

  const fetchReviews = useCallback(async () => {
    try {
      const [reviewsData, statsData] = await Promise.all([
        reviewsAPI.getReviews({
          [reviewType === 'post' ? 'post_id' : 'profile_id']: targetId,
          review_type: reviewType
        }),
        showStats ? reviewsAPI.getReviewStats(targetId, reviewType) : null
      ])
      
      setReviews(reviewsData)
      if (statsData) {
        setStats(statsData)
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
      toast({
        title: "Błąd",
        description: "Nie udało się załadować recenzji.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [targetId, reviewType, showStats, toast])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const handleReviewCreated = () => {
    setShowReviewForm(false)
    fetchReviews()
  }

  const handleReviewDeleted = (reviewId: string) => {
    setReviews(prev => prev.filter(review => review.id !== reviewId))
    fetchReviews() // Refresh stats
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-20 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {showStats && stats && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-3 flex items-center space-x-2">
            <Star className="h-4 w-4" />
            <span>Statystyki recenzji</span>
          </h3>
          <ReviewStatsComponent stats={stats} />
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          Recenzje ({reviews.length})
        </h3>
        {canAddReview && !showReviewForm && (
          <Button
            onClick={() => setShowReviewForm(true)}
            size="sm"
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Dodaj recenzję</span>
          </Button>
        )}
      </div>

      {showReviewForm && (
        <div className="bg-card border border-border rounded-lg p-4">
          <ReviewForm
            reviewType={reviewType}
            targetId={targetId}
            targetName={targetName}
            receiverId={receiverId}
            onReviewCreated={handleReviewCreated}
            onCancel={() => setShowReviewForm(false)}
          />
        </div>
      )}

      <div className="space-y-3">
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Brak recenzji</p>
            <p className="text-sm">Bądź pierwszym, który doda recenzję!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onDelete={handleReviewDeleted}
              showDeleteButton={true}
            />
          ))
        )}
      </div>
    </div>
  )
}
