"use client"

import { useState } from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: "sm" | "md" | "lg"
  interactive?: boolean
  onRatingChange?: (rating: number) => void
  className?: string
}

export function StarRating({ 
  rating, 
  maxRating = 5, 
  size = "md", 
  interactive = false, 
  onRatingChange,
  className 
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0)

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  }

  const handleClick = (newRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(newRating)
    }
  }

  const handleMouseEnter = (newRating: number) => {
    if (interactive) {
      setHoverRating(newRating)
    }
  }

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0)
    }
  }

  const displayRating = hoverRating || rating

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: maxRating }, (_, index) => {
        const starValue = index + 1
        const isFilled = starValue <= displayRating
        
        return (
          <button
            key={index}
            type="button"
            className={cn(
              "transition-colors duration-150",
              interactive && "cursor-pointer hover:scale-110",
              !interactive && "cursor-default"
            )}
            onClick={() => handleClick(starValue)}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
            disabled={!interactive}
          >
            <Star
              className={cn(
                sizeClasses[size],
                isFilled 
                  ? "fill-yellow-400 text-yellow-400" 
                  : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
