"use client"

import { Header } from "@/components/header"
import { PostsFeed } from "@/components/posts-feed"
import { ChatPanel } from "@/components/chat-panel"
import { useState } from "react"

export default function HomePage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [selectedChatUser, setSelectedChatUser] = useState<{name: string; avatar?: string; rating: number} | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const handleContactUser = (postId: string, _authorName: string, authorData: {name: string; avatar?: string; rating: number}) => {
    setSelectedChatId(postId)
    setSelectedChatUser(authorData)
    setIsChatOpen(true)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={handleSearch} />
      <main className="flex h-[calc(100vh-4rem)]">
        <div className={`transition-all duration-300 ${isChatOpen ? "flex-1" : "w-full"} border-r border-border`}>
          <PostsFeed onContactUser={handleContactUser} searchQuery={searchQuery} />
        </div>

        <div className={`transition-all duration-300 ${isChatOpen ? "w-96" : "w-0 overflow-hidden"} md:w-96`}>
          <ChatPanel
            selectedChatId={selectedChatId}
            selectedChatUser={selectedChatUser}
            onClose={() => setIsChatOpen(false)}
          />
        </div>
      </main>
    </div>
  )
}
