"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PostCard } from "@/components/post-card"
import { CreatePostModal } from "@/components/create-post-modal"
import { Edit, Plus, Star, DollarSign, BookOpen, Calendar, MapPin, Mail, Phone, Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const defaultUser = {
  id: "current-user",
  name: "Alex Johnson",
  email: "alex.johnson@university.edu",
  phone: "+1 (555) 123-4567",
  avatar: "/student-alex-studying.png",
  rating: 4.6,
  totalEarnings: 1250,
  completedJobs: 23,
  joinDate: "September 2023",
  location: "University Campus",
  bio: "Computer Science major with a passion for helping fellow students succeed. Specializing in programming, mathematics, and technical writing.",
  subjects: ["Computer Science", "Mathematics", "Physics", "Technical Writing"],
  availability: "Evenings and weekends",
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<any>(null)
  const { toast } = useToast()

  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("currentUser")
      return saved ? JSON.parse(saved) : defaultUser
    }
    return defaultUser
  })

  const [editedUser, setEditedUser] = useState(currentUser)

  const [userPosts, setUserPosts] = useState(() => {
    if (typeof window !== "undefined") {
      const allPosts = localStorage.getItem("marketplace-posts")
      if (allPosts) {
        const posts = JSON.parse(allPosts)
        return posts.filter((post: any) => post.author.name === currentUser.name)
      }
    }
    return []
  })

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("currentUser", JSON.stringify(currentUser))
    }
  }, [currentUser])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const allPosts = localStorage.getItem("marketplace-posts")
      if (allPosts) {
        const posts = JSON.parse(allPosts)
        setUserPosts(posts.filter((post: any) => post.author.name === currentUser.name))
      }
    }
  }, [currentUser.name])

  const handleSave = () => {
    setCurrentUser(editedUser)

    // Update all posts with new user data
    if (typeof window !== "undefined") {
      const allPosts = localStorage.getItem("marketplace-posts")
      if (allPosts) {
        const posts = JSON.parse(allPosts)
        const updatedPosts = posts.map((post: any) => {
          if (post.author.name === currentUser.name) {
            return {
              ...post,
              author: {
                ...post.author,
                name: editedUser.name,
                avatar: editedUser.avatar,
                rating: editedUser.rating,
              },
            }
          }
          return post
        })
        localStorage.setItem("marketplace-posts", JSON.stringify(updatedPosts))
      }
    }

    toast({
      title: "Profile updated",
      description: "Your profile has been saved successfully.",
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedUser(currentUser)
    setIsEditing(false)
  }

  const handlePostCreated = (newPost: any) => {
    if (typeof window !== "undefined") {
      const allPosts = localStorage.getItem("marketplace-posts")
      const posts = allPosts ? JSON.parse(allPosts) : []

      const existingIndex = posts.findIndex((p: any) => p.id === newPost.id)
      if (existingIndex >= 0) {
        posts[existingIndex] = newPost
      } else {
        posts.unshift(newPost)
      }

      localStorage.setItem("marketplace-posts", JSON.stringify(posts))
      setUserPosts(posts.filter((post: any) => post.author.name === currentUser.name))
    }
    setEditingPost(null)
  }

  const handleEditPost = (post: any) => {
    setEditingPost(post)
    setIsCreateModalOpen(true)
  }

  const handleDeletePost = (postId: string) => {
    if (typeof window !== "undefined") {
      const allPosts = localStorage.getItem("marketplace-posts")
      if (allPosts) {
        const posts = JSON.parse(allPosts)
        const updatedPosts = posts.filter((p: any) => p.id !== postId)
        localStorage.setItem("marketplace-posts", JSON.stringify(updatedPosts))
        setUserPosts(updatedPosts.filter((post: any) => post.author.name === currentUser.name))
      }
    }
  }

  const handleCloseModal = () => {
    setIsCreateModalOpen(false)
    setEditingPost(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Profile Header */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={editedUser.avatar && editedUser.avatar !== "/placeholder.svg" ? editedUser.avatar : undefined}
                    alt={editedUser.name}
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {editedUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  {isEditing ? (
                    <Input
                      value={editedUser.name}
                      onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                      className="text-2xl font-bold mb-2 bg-input border-border"
                    />
                  ) : (
                    <h1 className="text-2xl font-bold text-foreground">{editedUser.name}</h1>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{editedUser.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span>${editedUser.totalEarnings} earned</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{editedUser.completedJobs} jobs completed</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} size="sm" className="bg-primary hover:bg-primary/90">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Bio */}
            <div>
              <h3 className="font-semibold text-foreground mb-2">About</h3>
              {isEditing ? (
                <Textarea
                  value={editedUser.bio}
                  onChange={(e) => setEditedUser({ ...editedUser, bio: e.target.value })}
                  className="bg-input border-border"
                  rows={3}
                />
              ) : (
                <p className="text-muted-foreground">{editedUser.bio}</p>
              )}
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {isEditing ? (
                      <Input
                        value={editedUser.email}
                        onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                        className="bg-input border-border"
                      />
                    ) : (
                      <span className="text-muted-foreground">{editedUser.email}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {isEditing ? (
                      <Input
                        value={editedUser.phone}
                        onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                        className="bg-input border-border"
                      />
                    ) : (
                      <span className="text-muted-foreground">{editedUser.phone}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {isEditing ? (
                      <Input
                        value={editedUser.location}
                        onChange={(e) => setEditedUser({ ...editedUser, location: e.target.value })}
                        className="bg-input border-border"
                      />
                    ) : (
                      <span className="text-muted-foreground">{editedUser.location}</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Details</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Joined {editedUser.joinDate}</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Subjects:</p>
                    <div className="flex flex-wrap gap-1">
                      {editedUser.subjects.map((subject) => (
                        <Badge key={subject} variant="secondary" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Posts Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">My Posts</CardTitle>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Post
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userPosts.map((post: any) => (
                <PostCard
                  key={post.id}
                  post={post}
                  showEditOptions={true}
                  onContact={() => {}}
                  onEdit={() => handleEditPost(post)}
                  onDelete={() => handleDeletePost(post.id)}
                />
              ))}
              {userPosts.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You haven't created any posts yet.</p>
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Post
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
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
