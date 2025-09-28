"use client"

import { StarRating } from "@/components/ui/star-rating"
import { ReviewStats } from "@/types/api"

interface ReviewStatsProps {
  stats: ReviewStats
  className?: string
}

export function ReviewStatsComponent({ stats, className }: ReviewStatsProps) {
  const { total_reviews, average_score, rating_breakdown } = stats

  if (total_reviews === 0) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-muted-foreground text-sm">
          Brak recenzji
        </p>
      </div>
    )
  }

  const getPercentage = (count: number) => {
    return total_reviews > 0 ? Math.round((count / total_reviews) * 100) : 0
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-4">
        <div className="text-center">
          <div className="text-2xl font-bold">
            {average_score.toFixed(1)}
          </div>
          <StarRating rating={Math.round(average_score)} size="sm" />
          <div className="text-sm text-muted-foreground">
            {total_reviews} recenzj{total_reviews === 1 ? 'a' : total_reviews < 5 ? 'e' : 'i'}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = rating_breakdown[`${stars === 5 ? 'five' : stars === 4 ? 'four' : stars === 3 ? 'three' : stars === 2 ? 'two' : 'one'}_stars` as keyof typeof rating_breakdown] as number
          const percentage = getPercentage(count)
          
          // Debug logging
          console.log(`Stars: ${stars}, Count: ${count}, Percentage: ${percentage}%`)
          
          return (
            <div key={stars} className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 w-16">
                <span className="text-sm font-medium">{stars}</span>
                <StarRating rating={stars} size="sm" />
              </div>
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(percentage, 0)}%` }}
                />
              </div>
              <div className="text-sm text-muted-foreground w-12 text-right">
                {count}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
