"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useState } from "react"

interface ChatListProps {
  onSelectChat: (chatId: string, userData: any) => void
  conversations: { [key: string]: any[] }
}

export function ChatList({ onSelectChat, conversations }: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const chats = Object.keys(conversations).map((userName) => {
    const userMessages = conversations[userName] || []
    const lastMessage = userMessages[userMessages.length - 1]
    const unreadCount = userMessages.filter((msg) => !msg.isMe && !msg.read).length

    return {
      id: userName,
      name: userName,
      avatar: "/placeholder.svg",
      lastMessage: lastMessage?.content || "No messages yet",
      timestamp: lastMessage?.timestamp || "Now",
      unread: unreadCount,
      online: true,
      subject: "General",
      userData: {
        name: userName,
        avatar: "/placeholder.svg",
        rating: 4.5,
      },
    }
  })

  const filteredChats = chats.filter(
    (chat) =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.subject.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search conversations..."
            className="pl-10 bg-input border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredChats.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No conversations yet</p>
              <p className="text-sm text-muted-foreground mt-2">Start chatting by contacting someone from a post!</p>
            </div>
          )}
          {filteredChats.map((chat) => (
            <button
              type="button"
              key={chat.id}
              onClick={() => onSelectChat(chat.id, chat.userData)}
              className="w-full p-3 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={chat.avatar && chat.avatar !== "/placeholder.svg" ? chat.avatar : undefined}
                      alt={chat.name}
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {chat.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  {chat.online && (
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-success rounded-full border-2 border-card" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-card-foreground truncate">{chat.name}</h3>
                    <span className="text-xs text-muted-foreground">{chat.timestamp}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                    {chat.unread > 0 && (
                      <Badge variant="default" className="ml-2 bg-primary text-primary-foreground">
                        {chat.unread}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{chat.subject}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
