"use client"

import React from "react"

import { useState, useId } from "react"
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
import { useToast } from "@/hooks/use-toast"
import { postsAPI } from "@/lib/api"
import type { CreatePostModalProps, Post, PostData } from "@/types/api"

export function CreatePostModal({ isOpen, onClose, onPostCreated, editingPost }: CreatePostModalProps) {
  const [postType, setPostType] = useState<"request" | "offer">(editingPost?.type || "request")
  const [subject, setSubject] = useState(editingPost?.subject || "")
  const [title, setTitle] = useState(editingPost?.title || "")
  const [description, setDescription] = useState(editingPost?.description || "")
  const [price, setPrice] = useState(editingPost?.price?.toString() || "")
  const [deadline, setDeadline] = useState(editingPost?.deadline || "")
  const [isUrgent, setIsUrgent] = useState(editingPost?.urgent || false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const titleId = useId()
  const descriptionId = useId()
  const priceId = useId()
  const deadlineId = useId()
  const urgentId = useId()

  const subjects = [
    "Zawodowe",
    "Matematyka",
    "Chemia",
    "Fizyka",
    "Biologia",
    "Informatyka",
    "Historia",
    "Język angielski",
    "Statystyka",
    "Języki obce",
    "Inżynieria",
    "Inne",
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
      setPostType(editingPost.type || "request")
      setSubject(editingPost.subject || "")
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
      toast({
        title: "Brakujące informacje",
        description: "Proszę wypełnić wszystkie wymagane pola.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const postData: PostData = {
        type: postType,
        title: title.trim(),
        description: description.trim(),
        subject,
        price: price ? Number.parseInt(price) : 0,
        deadline: deadline || undefined,
        urgent: isUrgent,
      }

      let result: Post
      if (editingPost) {
        result = await postsAPI.updatePost(editingPost.id, postData)
      } else {
        result = await postsAPI.createPost(postData)
      }

      if (onPostCreated) {
        onPostCreated(result)
      }

      toast({
        title: editingPost ? "Ogłoszenie zaktualizowane!" : "Ogłoszenie utworzone!",
        description: `Twoje ${postType === "request" ? "zapytanie" : "oferta"} zostało ${editingPost ? "zaktualizowane" : "opublikowane"} na rynku.`,
      })

      onClose()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Wystąpił nieznany błąd'
      toast({
        title: editingPost ? "Aktualizacja nieudana" : "Tworzenie nieudane",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px] bg-popover border-border">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground">{editingPost ? "Edytuj ogłoszenie" : "Utwórz nowe ogłoszenie"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {editingPost
              ? "Zaktualizuj szczegóły swojego ogłoszenia."
              : "Opublikuj zapytanie o pomoc lub zaoferuj swoje usługi korepetycji innym studentom."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-popover-foreground">
                  Typ ogłoszenia
                </Label>
                <Select value={postType} onValueChange={(value: "request" | "offer") => setPostType(value)}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="request">Poproś o pomoc</SelectItem>
                    <SelectItem value="offer">Zaoferuj pomoc</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-popover-foreground">
                  Przedmiot *
                </Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Wybierz przedmiot" />
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
                Tytuł *
              </Label>
              <Input
                id={titleId}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={postType === "request" ? "Z czym potrzebujesz pomocy?" : "Z czym możesz pomóc?"}
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={descriptionId} className="text-popover-foreground">
                Opis *
              </Label>
              <Textarea
                id={descriptionId}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Podaj więcej szczegółów dotyczących swojego zapytania lub oferty..."
                className="bg-input border-border min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={priceId} className="text-popover-foreground">
                  Cena (zł)
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
                    Termin (opcjonalny)
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
                Oznacz jako pilne (dodatkowa widoczność)
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
              Anuluj
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? editingPost
                  ? "Aktualizowanie..."
                  : "Tworzenie..."
                : editingPost
                  ? "Zaktualizuj ogłoszenie"
                  : "Utwórz ogłoszenie"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
