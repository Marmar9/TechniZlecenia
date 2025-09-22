"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PostCard } from "@/components/post-card"
import { CreatePostModal } from "@/components/create-post-modal"
import { BookOpen, Mail, ArrowLeft, ChevronLeft, ChevronRight, Plus, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { postsAPI, userAPI, authAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Post, User } from "@/types/api"

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  // Get userId from params array
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId

  const [user, setUser] = useState<User | null>(null)
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPosts, setTotalPosts] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)

  const postsPerPage = 5

  // Check if this is the current user's profile
  const [isOwnProfile, setIsOwnProfile] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("currentUser")
      if (userData) {
        const user = JSON.parse(userData)
        // Check if this is own profile by comparing ID
        const isOwn = user.id === userId
        setIsOwnProfile(isOwn)
      }
    }
  }, [userId])

  // Logout handler
  const handleLogout = async () => {
    try {
      await authAPI.logout()
      toast({
        title: "Wylogowano",
        description: "Zostałeś pomyślnie wylogowany.",
      })
      // Redirect to login page
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Even if the API call fails, clear local storage and redirect
      authAPI.clearUserData()
      toast({
        title: "Wylogowano",
        description: "Zostałeś wylogowany.",
      })
      router.push('/auth/login')
    }
  }

  // Post edit handlers
  const handlePostCreated = (_newPost: Post) => {
    // Refresh the posts and total count after creating/editing
    fetchUserPosts(currentPage, true)
    fetchTotalPostsCount()
    setEditingPost(null)
  }

  const handleEditPost = (post: Post) => {
    setEditingPost(post)
    setIsCreateModalOpen(true)
  }

  const handleDeletePost = async (postId: string) => {
    try {
      await postsAPI.deletePost(postId)
      // Refresh posts and total count after deletion
      fetchUserPosts(currentPage, true)
      fetchTotalPostsCount()
      toast({
        title: "Ogłoszenie usunięte",
        description: "Twoje ogłoszenie zostało pomyślnie usunięte.",
      })
    } catch (_error) {
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć ogłoszenia. Spróbuj ponownie.",
        variant: "destructive",
      })
    }
  }

  // Function to fetch total posts count for the user
  const fetchTotalPostsCount = useCallback(async () => {
    if (!userId) return
    
    try {
      const allPosts = await postsAPI.getAllPostsLegacy()
      const userPostsCount = allPosts.filter(post => post.owner_id === userId).length
      setTotalPosts(userPostsCount)
    } catch (error) {
      console.error('Failed to fetch total posts count:', error)
    }
  }, [userId])

  // Function to fetch user posts
  const fetchUserPosts = useCallback(async (page: number, forceRefresh = false) => {
    if (!userId) return
    
    setIsLoading(true)
    try {
      const allPosts = await postsAPI.getAllPostsLegacy()
      const userPosts = allPosts.filter(post => post.owner_id === userId)
      
      // Sort by creation date (newest first)
      userPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      
      // Pagination
      const startIndex = page * postsPerPage
      const endIndex = startIndex + postsPerPage
      const paginatedPosts = userPosts.slice(startIndex, endIndex)
      
      setUserPosts(paginatedPosts)
      
      if (forceRefresh) {
        fetchTotalPostsCount()
      }
    } catch (error) {
      console.error('Failed to fetch user posts:', error)
      toast({
        title: "Błąd ładowania",
        description: "Nie udało się załadować ogłoszeń użytkownika.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [userId, postsPerPage, fetchTotalPostsCount, toast])

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    if (!userId) return
    
    try {
      const userData = await userAPI.getUserById(userId)
      setUser(userData)
    } catch (error) {
      console.error('Failed to fetch user data:', error)
      toast({
        title: "Błąd ładowania",
        description: "Nie udało się załadować danych użytkownika.",
        variant: "destructive",
      })
    }
  }, [userId, toast])

  // Initial data fetch
  useEffect(() => {
    if (userId) {
      fetchUserData()
      fetchUserPosts(0)
      fetchTotalPostsCount()
    }
  }, [userId, fetchUserData, fetchUserPosts, fetchTotalPostsCount])

  // Pagination handlers
  const handlePreviousPage = () => {
    if (currentPage > 0) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      fetchUserPosts(newPage)
    }
  }

  const handleNextPage = () => {
    const totalPages = Math.ceil(totalPosts / postsPerPage)
    if (currentPage < totalPages - 1) {
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      fetchUserPosts(newPage)
    }
  }

  const totalPages = Math.ceil(totalPosts / postsPerPage)

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Ładowanie profilu...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Użytkownik nie został znaleziony</p>
            <Button 
              onClick={() => router.push('/')} 
              className="mt-4"
              variant="outline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Wróć do strony głównej
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Profile Header */}
          <div className="mb-6">
            <Button 
              onClick={() => router.push('/')} 
              variant="ghost" 
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Wróć
            </Button>
            
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="text-lg">
                        {user.name?.split(' ').map(n => n[0]).join('') || user.username?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-2xl text-card-foreground">
                        {user.name || user.username || 'Nieznany użytkownik'}
                      </CardTitle>
                      <p className="text-muted-foreground">@{user.username || 'brak'}</p>
                      {user.email && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {user.email}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isOwnProfile && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nowe ogłoszenie
                      </Button>
                      <Button
                        onClick={handleLogout}
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Wyloguj
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Posts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Ogłoszenia ({totalPosts})
              </h2>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 0}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Poprzednia
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Strona {currentPage + 1} z {totalPages}
                  </span>
                  <Button
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages - 1}
                    variant="outline"
                    size="sm"
                  >
                    Następna
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Ładowanie ogłoszeń...</p>
              </div>
            ) : userPosts.length > 0 ? (
              <div className="space-y-4">
                {userPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onEdit={isOwnProfile ? () => handleEditPost(post) : undefined}
                    onDelete={isOwnProfile ? () => handleDeletePost(post.id) : undefined}
                    showEditOptions={isOwnProfile}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {isOwnProfile ? 'Nie masz jeszcze żadnych ogłoszeń' : 'Ten użytkownik nie ma jeszcze żadnych ogłoszeń'}
                </p>
                {isOwnProfile && (
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Utwórz pierwsze ogłoszenie
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setEditingPost(null)
        }}
        onPostCreated={handlePostCreated}
        editingPost={editingPost || undefined}
      />
    </div>
  )
}
