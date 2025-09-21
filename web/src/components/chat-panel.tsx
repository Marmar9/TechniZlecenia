"use client"

import type React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Paperclip, Phone, Video, MoreVertical, ArrowLeft, X } from "lucide-react"
import { useState, useEffect } from "react"
import { ChatList } from "@/components/chat-list"

interface ChatPanelProps {
  selectedChatId?: string | null
  selectedChatUser?: any | null
  onClose?: () => void
}

export function ChatPanel({ selectedChatId: propSelectedChatId, selectedChatUser, onClose }: ChatPanelProps) {
  const [selectedChat, setSelectedChat] = useState<string | null>(propSelectedChatId || null)
  const [currentChatUser, setCurrentChatUser] = useState<any>(selectedChatUser || null)
  const [newMessage, setNewMessage] = useState("")
  const [conversations, setConversations] = useState<{ [key: string]: any[] }>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chat-conversations")
      return saved ? JSON.parse(saved) : {}
    }
    return {}
  })

  useEffect(() => {
    if (propSelectedChatId && selectedChatUser) {
      setSelectedChat(propSelectedChatId)
      setCurrentChatUser(selectedChatUser)

      if (!conversations[selectedChatUser.name]) {
        const initialMessages = [
          {
            id: "1",
            sender: selectedChatUser.name,
            content: `Hi! I saw your post. Are you available to help?`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isMe: false,
          },
          {
            id: "2",
            sender: "You",
            content: "Yes, I can help! What do you need assistance with?",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isMe: true,
          },
        ]
        setConversations((prev) => ({
          ...prev,
          [selectedChatUser.name]: initialMessages,
        }))
      }
    }
  }, [propSelectedChatId, selectedChatUser, conversations[selectedChatUser?.name || ""]])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("chat-conversations", JSON.stringify(conversations))
    }
  }, [conversations])

  const handleSendMessage = () => {
    if (!newMessage.trim() || !currentChatUser) return

    const message = {
      id: Date.now().toString(),
      sender: "You",
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isMe: true,
    }

    setConversations((prev) => ({
      ...prev,
      [currentChatUser.name]: [...(prev[currentChatUser.name] || []), message],
    }))
    setNewMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSelectChat = (chatId: string, userData: any) => {
    setSelectedChat(chatId)
    setCurrentChatUser(userData)
  }

  if (!selectedChat || !currentChatUser) {
    return (
      <div className="h-full flex flex-col bg-card border-l border-border">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-card-foreground">Messages</h2>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="md:hidden">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <ChatList onSelectChat={handleSelectChat} conversations={conversations} />
      </div>
    )
  }

  const messages = conversations[currentChatUser.name] || []

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedChat(null)
                setCurrentChatUser(null)
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={
                  currentChatUser.avatar && currentChatUser.avatar !== "/placeholder.svg"
                    ? currentChatUser.avatar
                    : undefined
                }
                alt={currentChatUser.name}
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                }}
              />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {currentChatUser.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-card-foreground">{currentChatUser.name}</h3>
              <p className="text-xs text-muted-foreground">Rating: {currentChatUser.rating} • Online</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <MoreVertical className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="md:hidden">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.isMe ? "justify-end" : "justify-start"}`}>
              <div className="flex items-end gap-2 max-w-[80%]">
                {!message.isMe && (
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src={
                        currentChatUser.avatar && currentChatUser.avatar !== "/placeholder.svg"
                          ? currentChatUser.avatar
                          : undefined
                      }
                      alt={currentChatUser.name}
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {currentChatUser.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`rounded-lg px-3 py-2 ${
                    message.isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-secondary-foreground rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${message.isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                  >
                    {message.timestamp}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <Input
              placeholder="Type a message..."
              className="bg-input border-border resize-none"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 px-2">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  )
}
