"use client"

import { PostCard } from "@/components/post-card"
import { CreatePostModal } from "@/components/create-post-modal"
import { useState, useMemo, useEffect } from "react"
import { Filter, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

const initialMockPosts = [
  {
    id: "1",
    type: "request" as const,
    title: "Need help with Calculus II homework",
    description:
      "Looking for someone to help me understand integration by parts and series convergence. Have 3 problem sets due this week.",
    subject: "Mathematics",
    price: 25,
    deadline: "2024-01-15",
    author: {
      name: "Sarah Chen",
      avatar: "/student-sarah.jpg",
      rating: 4.8,
    },
    createdAt: "2 hours ago",
    urgent: true,
  },
  {
    id: "2",
    type: "offer" as const,
    title: "Chemistry tutor available",
    description:
      "PhD student offering help with organic chemistry, biochemistry, and general chemistry. Can help with lab reports and exam prep.",
    subject: "Chemistry",
    price: 30,
    author: {
      name: "Mike Rodriguez",
      avatar: "/student-mike.jpg",
      rating: 4.9,
    },
    createdAt: "4 hours ago",
    urgent: false,
  },
  {
    id: "3",
    type: "request" as const,
    title: "Essay proofreading needed",
    description:
      "Need someone to proofread my 10-page history essay on World War II. Looking for grammar, structure, and citation help.",
    subject: "History",
    price: 20,
    deadline: "2024-01-12",
    author: {
      name: "Alex Johnson",
      avatar: "/student-alex-studying.png",
      rating: 4.6,
    },
    createdAt: "6 hours ago",
    urgent: false,
  },
  {
    id: "4",
    type: "offer" as const,
    title: "Python programming help",
    description:
      "Computer Science major offering help with Python projects, data structures, algorithms, and debugging. Available evenings.",
    subject: "Computer Science",
    price: 35,
    author: {
      name: "Emma Davis",
      avatar: "/student-emma.jpg",
      rating: 5.0,
    },
    createdAt: "8 hours ago",
    urgent: false,
  },
  {
    id: "5",
    type: "request" as const,
    title: "Statistics exam prep help",
    description:
      "Final exam is next week and I'm struggling with hypothesis testing and regression analysis. Need intensive tutoring sessions.",
    subject: "Statistics",
    price: 40,
    deadline: "2024-01-18",
    author: {
      name: "Jordan Kim",
      avatar: "/student-jordan.jpg",
      rating: 4.7,
    },
    createdAt: "12 hours ago",
    urgent: true,
  },
  {
    id: "6",
    type: "offer" as const,
    title: "French conversation practice",
    description:
      "Native French speaker offering conversation practice and pronunciation help. Perfect for improving fluency before oral exams.",
    subject: "Languages",
    price: 25,
    author: {
      name: "Marie Dubois",
      avatar: "/student-marie.jpg",
      rating: 4.9,
    },
    createdAt: "1 day ago",
    urgent: false,
  },
]

interface PostsFeedProps {
  onContactUser?: (postId: string, authorName: string, authorData: any) => void
  searchQuery?: string
}

export function PostsFeed({ onContactUser, searchQuery = "" }: PostsFeedProps) {
  const [posts, setPosts] = useState(() => {
    if (typeof window !== "undefined") {
      const savedPosts = localStorage.getItem("marketplace-posts")
      return savedPosts ? JSON.parse(savedPosts) : initialMockPosts
    }
    return initialMockPosts
  })

  const [filter, setFilter] = useState<"all" | "requests" | "offers">("all")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("marketplace-posts", JSON.stringify(posts))
    }
  }, [posts])

  const filteredPosts = useMemo(() => {
    let filteredList = posts.filter((post: { type: string }) => {
      if (filter === "all") return true
      if (filter === "requests") return post.type === "request"
      if (filter === "offers") return post.type === "offer"
      return true
    })

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filteredList = filteredList.filter(
        (post: { title: string; description: string; subject: string; author: { name: string } }) =>
          post.title.toLowerCase().includes(query) ||
          post.description.toLowerCase().includes(query) ||
          post.subject.toLowerCase().includes(query) ||
          post.author.name.toLowerCase().includes(query),
      )
    }

    return filteredList
  }, [posts, filter, searchQuery])

  const handleContact = (post: any) => {
    if (onContactUser) {
      onContactUser(post.id, post.author.name, post.author)
    }
  }

  const handlePostCreated = (newPost: any) => {
    setPosts((prevPosts: any[]) => {
      const existingIndex = prevPosts.findIndex((p: { id: any }) => p.id === newPost.id)
      if (existingIndex >= 0) {
        // Update existing post
        const updated = [...prevPosts]
        updated[existingIndex] = newPost
        return updated
      } else {
        // Add new post
        return [newPost, ...prevPosts]
      }
    })
    setEditingPost(null)
  }

  const handleDeletePost = (postId: string) => {
    setPosts((prevPosts: any[]) => prevPosts.filter((p: { id: string }) => p.id !== postId))
  }

  const handleEditPost = (post: any) => {
    setEditingPost(post)
    setIsCreateModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsCreateModalOpen(false)
    setEditingPost(null)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Academic Marketplace</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:text-foreground bg-transparent"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Post
            </Button>
          </div>
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
            All ({filteredPosts.length})
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
            Requests ({filteredPosts.filter((p: { type: string }) => p.type === "request").length})
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
            Offers ({filteredPosts.filter((p: { type: string }) => p.type === "offer").length})
          </button>
        </div>

        {searchQuery.trim() && (
          <div className="mt-2 text-sm text-muted-foreground">
            {filteredPosts.length} result{filteredPosts.length !== 1 ? "s" : ""} for "{searchQuery}"
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {filteredPosts
          .sort((a: { urgent: any }, b: { urgent: any }) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0))
          .map((post: any) => (
            <PostCard
              key={post.id}
              post={post}
              onContact={() => handleContact(post)}
              onEdit={() => handleEditPost(post)}
              onDelete={() => handleDeletePost(post.id)}
              showEditOptions={true}
            />
          ))}

        {filteredPosts.length === 0 && searchQuery.trim() && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No posts found matching "{searchQuery}"</p>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting your search terms or filters</p>
          </div>
        )}

        {filteredPosts.length === 0 && !searchQuery.trim() && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No posts available</p>
            <p className="text-sm text-muted-foreground mt-2">Be the first to create a post!</p>
          </div>
        )}
      </div>

      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        onPostCreated={handlePostCreated}
        editingPost={editingPost}
      />
    </div>
  )
}
