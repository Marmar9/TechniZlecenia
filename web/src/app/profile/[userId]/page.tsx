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
        title: "Logged out",
        description: "You have been successfully logged out.",
      })
      // Redirect to login page
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Even if the API call fails, clear local storage and redirect
      authAPI.clearUserData()
      toast({
        title: "Logged out",
        description: "You have been logged out.",
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
        title: "Post deleted",
        description: "Your post has been removed successfully.",
      })
    } catch (_error) {
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Function to fetch total posts count for the user
  const fetchTotalPostsCount = useCallback(async () => {
    try {
      // Fetch all posts to get the total count - this is a simple approach
      // In a production app, you'd want a dedicated API endpoint for count
      const allUserPosts = await postsAPI.getAllPosts(0, 1000, userId) // Large limit to get all posts
      setTotalPosts(allUserPosts.length)
    } catch (error) {
      console.error('Error fetching total posts count:', error)
    }
  }, [userId])

  // Function to fetch posts for specific page
  const fetchUserPosts = useCallback(async (page: number, replace: boolean = false) => {
    try {
      if (page === 0 || replace) {
        setIsLoading(true)
      } else {
        setIsPaginationLoading(true)
      }

      // Fetch posts from backend with server-side filtering
      const userPosts = await postsAPI.getAllPosts(page, postsPerPage, userId)
      
      if (page === 0 || replace) {
        setUserPosts(userPosts)
      } else {
        // For next pages, replace the posts
        setUserPosts(userPosts)
      }
      
      // Check if there are more posts - if we got exactly postsPerPage, there might be more
      setHasMorePosts(userPosts.length === postsPerPage)
      
    } catch (error) {
      console.error('Error fetching user posts:', error)
      setError("Failed to load user posts")
    } finally {
      setIsLoading(false)
      setIsPaginationLoading(false)
    }
  }, [userId])

  useEffect(() => {
    const fetchUserAndPosts = async () => {
      try {
        setIsLoading(true)
        
        // Fetch user information
        const userInfo = await userAPI.getUserById(userId)
        if (!userInfo) {
          setError("User not found")
          return
        }
        setUser(userInfo)

        // Reset pagination state
        setCurrentPage(0)
        setUserPosts([])
        setHasMorePosts(true)

        // Fetch total posts count and first page of posts
        await Promise.all([
          fetchTotalPostsCount(),
          fetchUserPosts(0)
        ])
        
      } catch (error) {
        console.error('Error fetching user profile:', error)
        setError("Failed to load user profile")
      }
    }

    if (userId) {
      fetchUserAndPosts()
    }
  }, [userId, fetchUserPosts, fetchTotalPostsCount])

  // Pagination handlers
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
        <Header />
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading user profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">User Not Found</h1>
            <p className="text-muted-foreground mb-4">{error || "The user you're looking for doesn't exist."}</p>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
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
      <Header />
      
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Profile Information */}
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
                    {user.name || user.username || 'Unknown User'}
                  </h1>
                  {isOwnProfile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{totalPosts} posts</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                </div>

                {/* Subjects */}
                {user.subjects && user.subjects.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-foreground mb-2">Subjects</h3>
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

        {/* User's Posts */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">
                {user.name || user.username}'s Posts ({totalPosts})
              </CardTitle>
              {isOwnProfile && (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Post
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userPosts.length > 0 ? (
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
                  
                  {/* Pagination Controls */}
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
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Post Modal */}
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
