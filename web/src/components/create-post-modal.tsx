"use client"

import React, { useId } from "react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

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
    avatar?: string
    rating: number
  }
  createdAt: string
  urgent: boolean
}

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated?: (post: Post) => void
  editingPost?: Post
}

export function CreatePostModal({ isOpen, onClose, onPostCreated, editingPost }: CreatePostModalProps) {
  const [postType, setPostType] = useState<"request" | "offer">(editingPost?.type || "request")
  const [subject, setSubject] = useState(editingPost?.subject || "")
  const [title, setTitle] = useState(editingPost?.title || "")
  const [description, setDescription] = useState(editingPost?.description || "")
  const [price, setPrice] = useState(editingPost?.price?.toString() || "")
  const [deadline, setDeadline] = useState(editingPost?.deadline || "")
  const [isUrgent, setIsUrgent] = useState(editingPost?.urgent || false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Generate stable IDs for form elements
  const titleId = useId()
  const descriptionId = useId()
  const priceId = useId()
  const deadlineId = useId()
  const urgentId = useId()

  const subjects = [
    "Mathematics",
    "Chemistry",
    "Physics",
    "Biology",
    "Computer Science",
    "History",
    "English",
    "Psychology",
    "Economics",
    "Statistics",
    "Languages",
    "Engineering",
    "Art",
    "Music",
    "Other",
  ]

  React.useEffect(() => {
    if (isOpen && !editingPost) {
      setPostType("request")
      setSubject("")
      setTitle("")
      setDescription("")
      setPrice("")
      setDeadline("")
      setIsUrgent(false)
    } else if (isOpen && editingPost) {
      setPostType(editingPost.type)
      setSubject(editingPost.subject)
      setTitle(editingPost.title)
      setDescription(editingPost.description)
      setPrice(editingPost.price?.toString() || "")
      setDeadline(editingPost.deadline || "")
      setIsUrgent(editingPost.urgent || false)
    }
  }, [isOpen, editingPost])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !description.trim() || !subject) {
      toast.error("Please fill in all required fields.")
      return
    }

    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const currentUser = JSON.parse(
      localStorage.getItem("currentUser") || '{"name": "You", "avatar": "/placeholder.svg", "rating": 4.5}',
    )

    const newPost = {
      id: editingPost?.id || Date.now().toString(),
      type: postType,
      title: title.trim(),
      description: description.trim(),
      subject,
      price: price ? Number.parseInt(price) : 0,
      deadline: deadline || undefined,
      author: currentUser,
      createdAt: editingPost?.createdAt || "Just now",
      urgent: isUrgent,
    }

    if (onPostCreated) {
      onPostCreated(newPost)
    }

    toast.success(
      editingPost ? "Post updated successfully!" : "Post created successfully!",
      {
        description: `Your ${postType} has been ${editingPost ? "updated" : "posted"} to the marketplace.`,
      }
    )

    setIsSubmitting(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px] bg-popover border-border">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground">{editingPost ? "Edit Post" : "Create New Post"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {editingPost
              ? "Update your post details."
              : "Post a request for help or offer your tutoring services to fellow students."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-popover-foreground">
                  Post Type
                </Label>
                <Select value={postType} onValueChange={(value: "request" | "offer") => setPostType(value)}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="request">Request Help</SelectItem>
                    <SelectItem value="offer">Offer Help</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-popover-foreground">
                  Subject *
                </Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {subjects.map((subj) => (
                      <SelectItem key={subj} value={subj}>
                        {subj}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={titleId} className="text-popover-foreground">
                Title *
              </Label>
              <Input
                id={titleId}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={postType === "request" ? "What do you need help with?" : "What can you help with?"}
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={descriptionId} className="text-popover-foreground">
                Description *
              </Label>
              <Textarea
                id={descriptionId}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide more details about your request or offer..."
                className="bg-input border-border min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={priceId} className="text-popover-foreground">
                  Price ($)
                </Label>
                <Input
                  id={priceId}
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  className="bg-input border-border"
                />
              </div>

              {postType === "request" && (
                <div className="space-y-2">
                  <Label htmlFor={deadlineId} className="text-popover-foreground">
                    Deadline (optional)
                  </Label>
                  <Input
                    id={deadlineId}
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch id={urgentId} checked={isUrgent} onCheckedChange={setIsUrgent} />
              <Label htmlFor={urgentId} className="text-popover-foreground">
                Mark as urgent (additional visibility)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border text-muted-foreground bg-transparent"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? editingPost
                  ? "Updating..."
                  : "Creating..."
                : editingPost
                  ? "Update Post"
                  : "Create Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

