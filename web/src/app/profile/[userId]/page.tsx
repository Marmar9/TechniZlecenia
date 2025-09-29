"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PostCard } from "@/components/features/post-card"
import { CreatePostModal } from "@/components/features/create-post-modal"
import { ReviewsList } from "@/components/features/reviews-list"
import { BookOpen, Mail, ArrowLeft, ChevronLeft, ChevronRight, Plus, LogOut, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { postsAPI, userAPI, authAPI } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import type { Post, User } from "@/types/api"

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { logout, user: currentUser } = useAuth()
  const userId = params.userId as string
  
  const [user, setUser] = useState<User | null>(null)
  const [userPosts, setUserPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPaginationLoading, setIsPaginationLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMorePosts, setHasMorePosts] = useState(true)
  const [totalPosts, setTotalPosts] = useState(0)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([])
  const [filter, setFilter] = useState<"all" | "requests" | "offers">("all")
  const postsPerPage = 5

  const isOwnProfile = currentUser?.id === userId

  useEffect(() => {
    let filtered = userPosts

    if (filter !== "all") {
      filtered = filtered.filter((post) => {
        if (filter === "requests") return post.type === "request"
        if (filter === "offers") return post.type === "offer"
        return true
      })
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.description.toLowerCase().includes(query) ||
          post.subject?.toLowerCase().includes(query)
      )
    }

    setFilteredPosts(filtered)
  }, [userPosts, searchQuery, filter])


  const handleLogout = async () => {
    try {
      await authAPI.logout()
      toast({
        title: "Wylogowano",
        description: "Zostałeś pomyślnie wylogowany.",
      })
    } catch (error) {
      console.error('Logout error:', error)
      toast({
        title: "Wylogowano",
        description: "Zostałeś wylogowany.",
      })
    } finally {
      logout()
    }
  }

  const handlePostCreated = async (_newPost: Post) => {
    setCurrentPage(0)
    setSearchQuery("")
    setFilter("all")
    await Promise.all([
      fetchTotalPostsCount(),
      fetchUserPosts(0, true)
    ])
    setIsCreateModalOpen(false)
    setEditingPost(null)
    toast({
      title: "Sukces",
      description: editingPost ? "Ogłoszenie zostało zaktualizowane!" : "Ogłoszenie zostało utworzone!",
    })
  }

  const handleEditPost = (post: Post) => {
    setEditingPost(post)
    setIsCreateModalOpen(true)
  }

  const handleDeletePost = async (postId: string) => {
    try {
      await postsAPI.deletePost(postId)
      await Promise.all([
        fetchTotalPostsCount(),
        fetchUserPosts(currentPage, true)
      ])
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

  const fetchTotalPostsCount = useCallback(async () => {
    try {
      const allUserPosts = await postsAPI.getAllPosts(0, 1000, userId)
      setTotalPosts(allUserPosts.length)
    } catch (error) {
      console.error('Error fetching total posts count:', error)
    }
  }, [userId])

  const fetchUserPosts = useCallback(async (page: number, replace: boolean = false) => {
    try {
      if (page === 0 || replace) {
        setIsLoading(true)
      } else {
        setIsPaginationLoading(true)
      }

      const userPosts = await postsAPI.getAllPosts(page, postsPerPage, userId)
      
      if (page === 0 || replace) {
        setUserPosts(userPosts)
      } else {
        setUserPosts(userPosts)
      }
      
      setHasMorePosts(userPosts.length === postsPerPage)
      
    } catch (error) {
      console.error('Error fetching user posts:', error)
      setError("Nie udało się załadować ogłoszeń użytkownika")
    } finally {
      setIsLoading(false)
      setIsPaginationLoading(false)
    }
  }, [userId])

  useEffect(() => {
    const fetchUserAndPosts = async () => {
      try {
        setIsLoading(true)
        
        const userInfo = await userAPI.getUserById(userId)
        if (!userInfo) {
          setError("Użytkownik nie znaleziony")
          return
        }
        setUser(userInfo)

        setCurrentPage(0)
        setUserPosts([])
        setHasMorePosts(true)

        await Promise.all([
          fetchTotalPostsCount(),
          fetchUserPosts(0)
        ])
        
      } catch (error) {
        console.error('Error fetching user profile:', error)
        setError("Nie udało się załadować profilu użytkownika")
      }
    }

    if (userId) {
      fetchUserAndPosts()
    }
  }, [userId])

  const handleNextPage = async () => {
    if (hasMorePosts && !isPaginationLoading) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      await fetchUserPosts(nextPage, true)
    }
  }

  const handlePreviousPage = async () => {
    if (currentPage > 0 && !isPaginationLoading) {
      const prevPage = currentPage - 1
      setCurrentPage(prevPage)
      await fetchUserPosts(prevPage, true)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Ładowanie profilu użytkownika...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Użytkownik nie znaleziony</h1>
            <p className="text-muted-foreground mb-4">{error || "Użytkownik, którego szukasz, nie istnieje."}</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Wstecz
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const userInitials = (user.name || user.username || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')

  return (
    <div className="min-h-screen bg-background">
      
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Wstecz
        </Button>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src="" alt={user.name || user.username} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-3xl font-bold text-foreground">
                    {user.name || user.username || 'Nieznany użytkownik'}
                  </h1>
                  {isOwnProfile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Wyloguj
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{totalPosts} ogłoszenia</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                </div>

                {user.subjects && user.subjects.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-foreground mb-2">Przedmioty</h3>
                    <div className="flex flex-wrap gap-2">
                      {user.subjects.map((subject) => (
                        <Badge key={subject} variant="secondary">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">
              Recenzje profilu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReviewsList
              targetId={userId}
              reviewType="profile"
              targetName={user.name || user.username || 'Użytkownik'}
              canAddReview={!isOwnProfile}
              showStats={true}
            />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">
                {user.name || user.username}'s Posts ({searchQuery.trim() || filter !== "all" ? filteredPosts.length : totalPosts})
              </CardTitle>
              {isOwnProfile && (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Utwórz ogłoszenie
                </Button>
              )}
            </div>
            
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj ogłoszeń..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="mt-4">
              <Tabs value={filter} onValueChange={(value) => setFilter(value as "all" | "requests" | "offers")}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">
                    Wszystkie ({userPosts.filter(p => p.type === "request" || p.type === "offer" || !p.type).length})
                  </TabsTrigger>
                  <TabsTrigger value="requests">
                    Zapytania ({userPosts.filter(p => p.type === "request").length})
                  </TabsTrigger>
                  <TabsTrigger value="offers">
                    Oferty ({userPosts.filter(p => p.type === "offer").length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(searchQuery.trim() || filter !== "all") ? (
                filteredPosts.length > 0 ? (
                  filteredPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      showEditOptions={isOwnProfile}
                      onEdit={() => handleEditPost(post)}
                      onDelete={() => handleDeletePost(post.id)}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchQuery.trim() 
                        ? `No posts found matching "${searchQuery}".`
                        : `No ${filter === "requests" ? "requests" : "offers"} found.`
                      }
                    </p>
                  </div>
                )
              ) : (
                userPosts.length > 0 ? (
                  <>
                    {userPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        showEditOptions={isOwnProfile}
                        onEdit={() => handleEditPost(post)}
                        onDelete={() => handleDeletePost(post.id)}
                      />
                    ))}
                    
                    {(currentPage > 0 || hasMorePosts) && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <Button 
                          variant="outline" 
                          onClick={handlePreviousPage}
                          disabled={currentPage === 0 || isPaginationLoading}
                          className="flex items-center gap-2"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Page {currentPage + 1}</span>
                          {isPaginationLoading && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          )}
                        </div>
                        
                        <Button 
                          variant="outline" 
                          onClick={handleNextPage}
                          disabled={!hasMorePosts || isPaginationLoading}
                          className="flex items-center gap-2"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">This user hasn't created any posts yet.</p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
