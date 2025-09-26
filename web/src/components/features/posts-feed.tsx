"use client"

import { PostCard } from "@/components/features/post-card"
import { CreatePostModal } from "@/components/features/create-post-modal"
import { useState, useMemo, useEffect } from "react"
import { postsAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Post } from "@/types/api"

interface PostsFeedProps {
  searchQuery?: string
}

export function PostsFeed({ searchQuery = "" }: PostsFeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [filter, setFilter] = useState<"all" | "requests" | "offers">("all")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await postsAPI.getAllPostsLegacy()
        setPosts(data || [])
      } catch (error: unknown) {
        console.error('Failed to fetch posts from API:', error)
        const errorMessage = error instanceof Error ? error.message : "Please check your connection and try again."
        toast({
          title: "Nie można załadować ogłoszeń",
          description: errorMessage,
          variant: "destructive",
        })
        setPosts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [toast])

  const filteredPosts = useMemo(() => {
    let filteredList = posts.filter((post) => {
      if (filter === "all") return true
      if (filter === "requests") return post.type === "request"
      if (filter === "offers") return post.type === "offer"
      return true
    })

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filteredList = filteredList.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.description.toLowerCase().includes(query) ||
          post.subject?.toLowerCase().includes(query) ||
          post.author?.name?.toLowerCase().includes(query),
      )
    }

    return filteredList
  }, [posts, filter, searchQuery])

  const handlePostCreated = async (newPost: Post) => {
    console.log('handlePostCreated called with:', newPost)
    setEditingPost(null)
    
    try {
      console.log('Refreshing posts from API...')
      const data = await postsAPI.getAllPostsLegacy()
      console.log('Fetched posts:', data)
      setPosts(data || [])
    } catch (error) {
      console.error('Failed to refresh posts:', error)
      throw error
    }
  }


  const handleDeletePost = async (postId: string) => {
    try {
      await postsAPI.deletePost(postId)
      setPosts((prevPosts) => prevPosts.filter((p) => p.id !== postId))
      toast({
        title: "Ogłoszenie usunięte",
        description: "Twoje ogłoszenie zostało usunięte z rynku.",
      })
      
      const refreshPosts = async () => {
        try {
          const data = await postsAPI.getAllPostsLegacy()
          setPosts(data || [])
        } catch (error) {
          console.error('Failed to refresh posts:', error)
          throw error
        }
      }
      refreshPosts()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Nie można usunąć ogłoszenia. Spróbuj ponownie."
      toast({
        title: "Usuwanie nieudane",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleEditPost = (post: Post) => {
    setEditingPost(post)
    setIsCreateModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsCreateModalOpen(false)
    setEditingPost(null)
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Ładowanie ogłoszeń...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-foreground">Ogłoszenia</h2>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            Wszystkie ({filteredPosts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("requests")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter === "requests"
                ? "bg-warning text-black"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            Zapytania ({filteredPosts.filter((p) => p.type === "request").length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("offers")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter === "offers"
                ? "bg-success text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            Oferty ({filteredPosts.filter((p) => p.type === "offer").length})
          </button>
        </div>

        {searchQuery.trim() && (
          <div className="mt-2 text-sm text-muted-foreground">
            {filteredPosts.length} wynik{filteredPosts.length !== 1 ? "ów" : ""} dla "{searchQuery}"
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {filteredPosts
          .sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0))
          .map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onEdit={() => handleEditPost(post)}
              onDelete={() => handleDeletePost(post.id)}
              showEditOptions={true}
            />
          ))}

        {filteredPosts.length === 0 && searchQuery.trim() && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nie znaleziono ogłoszeń pasujących do "{searchQuery}"</p>
            <p className="text-sm text-muted-foreground mt-2">Spróbuj zmienić terminy wyszukiwania lub filtry</p>
          </div>
        )}

        {filteredPosts.length === 0 && !searchQuery.trim() && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Brak dostępnych ogłoszeń</p>
            <p className="text-sm text-muted-foreground mt-2">Bądź pierwszym, który utworzy ogłoszenie!</p>
          </div>
        )}
      </div>

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        onPostCreated={handlePostCreated}
        editingPost={editingPost || undefined}
      />
    </div>
  )
}
