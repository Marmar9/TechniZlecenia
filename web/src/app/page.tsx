"use client"

import { PostsFeed } from "@/components/features/posts-feed"
import { MatchingSuggestions } from "@/components/features/matching-suggestions"
import { useState } from "react"

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <PostsFeed searchQuery={searchQuery} />
          </div>
          <div className="lg:col-span-1">
            <MatchingSuggestions />
          </div>
        </div>
      </main>
    </div>
  )
}
