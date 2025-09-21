"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Clock, DollarSign, MessageCircle, Star, AlertCircle, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Post {
  id: string
  type: "request" | "offer"
  title: string
  description: string
  subject: string
  price: number
  deadline?: string
  author: {
    name: string
    avatar: string
    rating: number
  }
  createdAt: string
  urgent?: boolean
}

interface PostCardProps {
  post: Post
  onContact: () => void
  showEditOptions?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function PostCard({ post, onContact, showEditOptions = false, onEdit, onDelete }: PostCardProps) {

  const handleEdit = () => {
    if (onEdit) {
      onEdit()
    }
  }

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this post?")) {
      if (onDelete) {
        onDelete()
        toast.success("Post deleted", {
          description: "Your post has been removed from the marketplace.",
        })
      }
    }
  }

  const currentUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("currentUser") || '{"name": "You"}')
      : { name: "You" }
  const isOwnPost = post.author.name === currentUser.name

  return (
    <Card
      className={`bg-card border-border hover:bg-accent/50 transition-colors cursor-pointer ${
        post.urgent ? "ring-2 ring-warning/50" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={post.author.avatar && post.author.avatar !== "/placeholder.svg" ? post.author.avatar : undefined}
                alt={post.author.name}
                onError={(e) => {
                  // Hide broken images
                  e.currentTarget.style.display = "none"
                }}
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {post.author.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-card-foreground">{post.author.name}</p>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-muted-foreground">{post.author.rating}</span>
                <span className="text-xs text-muted-foreground">• {post.createdAt}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {post.urgent && (
              <Badge variant="outline" className="border-warning text-warning">
                <AlertCircle className="h-3 w-3 mr-1" />
                Urgent
              </Badge>
            )}
            <Badge
              variant={post.type === "request" ? "destructive" : "default"}
              className={post.type === "request" ? "bg-warning text-black" : "bg-success text-white"}
            >
              {post.type === "request" ? "Request" : "Offer"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <h3 className="font-semibold text-card-foreground mb-2 text-balance">{post.title}</h3>
        <p className="text-sm text-muted-foreground mb-3 text-pretty">{post.description}</p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="bg-secondary px-2 py-1 rounded text-secondary-foreground">{post.subject}</span>
          {post.deadline && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Due {post.deadline}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 flex items-center justify-between">
        <div className="flex items-center gap-1 text-lg font-semibold text-card-foreground">
          <DollarSign className="h-4 w-4" />
          {post.price}
        </div>
        <div className="flex items-center gap-2">
          {showEditOptions && isOwnPost ? (
            <>
              <Button variant="outline" size="sm" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive bg-transparent"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          ) : !isOwnPost ? (
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={onContact}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact
            </Button>
          ) : null}
        </div>
      </CardFooter>
    </Card>
  )
}

