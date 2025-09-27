"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/ui/star-rating"
import { Users, TrendingUp } from "lucide-react"
import { userAPI, reviewsAPI } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import type { User, ReviewStats } from "@/types/api"

interface MatchingUser {
  user: User
  stats: ReviewStats
  matchScore: number
  commonSubjects: string[]
}

export function MatchingSuggestions() {
  const { user: currentUser } = useAuth()
  const router = useRouter()
  const [matchingUsers, setMatchingUsers] = useState<MatchingUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) return

    const fetchMatchingUsers = async () => {
      try {
        setIsLoading(true)
        
        // Get all users (in a real app, this would be a more sophisticated matching algorithm)
        const allUsers = await userAPI.getAllUsers()
        
        // Filter out current user and get users with reviews
        const usersWithReviews = await Promise.all(
          allUsers
            .filter(u => u.id !== currentUser.id)
            .map(async (user) => {
              try {
                const stats = await reviewsAPI.getReviewStats(user.id, 'profile')
                return { user, stats }
              } catch {
                return null
              }
            })
        )

        // Filter out users without reviews and calculate match scores
        const validUsers = usersWithReviews
          .filter((item): item is { user: User; stats: ReviewStats } => item !== null)
          .map(({ user, stats }) => {
            const commonSubjects = currentUser.subjects?.filter(subject => 
              user.subjects?.includes(subject)
            ) || []
            
            // Calculate match score based on:
            // 1. Common subjects (40%)
            // 2. Review rating (30%)
            // 3. Number of reviews (20%)
            // 4. Random factor for variety (10%)
            const subjectScore = (commonSubjects.length / Math.max(currentUser.subjects?.length || 1, 1)) * 40
            const ratingScore = (stats.average_score / 5) * 30
            const reviewCountScore = Math.min(stats.total_reviews / 10, 1) * 20
            const randomScore = Math.random() * 10
            
            const matchScore = subjectScore + ratingScore + reviewCountScore + randomScore

            return {
              user,
              stats,
              matchScore,
              commonSubjects
            }
          })
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 6) // Show top 6 matches

        setMatchingUsers(validUsers)
      } catch (error) {
        console.error('Failed to fetch matching users:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMatchingUsers()
  }, [currentUser])

  const handleViewProfile = (userId: string) => {
    router.push(`/profile/${userId}`)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Polecane profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (matchingUsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Polecane profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Brak polecanych profili</p>
            <p className="text-sm">Sprawdź ponownie później</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Polecane profile</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {matchingUsers.map((match) => (
            <div
              key={match.user.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  {(match.user.name || match.user.username || "U")
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {match.user.name || match.user.username || "Nieznany użytkownik"}
                  </p>
                  <div className="flex items-center space-x-2">
                    <StarRating rating={Math.round(match.stats.average_score)} size="sm" />
                    <span className="text-xs text-muted-foreground">
                      {match.stats.average_score.toFixed(1)} ({match.stats.total_reviews} recenzji)
                    </span>
                  </div>
                  {match.commonSubjects.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {match.commonSubjects.slice(0, 2).map((subject) => (
                        <Badge key={subject} variant="secondary" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                      {match.commonSubjects.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{match.commonSubjects.length - 2} więcej
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleViewProfile(match.user.id)}
                className="text-xs"
              >
                Zobacz profil
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
