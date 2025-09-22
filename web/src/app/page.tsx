"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { PostsFeed } from "@/components/posts-feed";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={handleSearch} />
      <main className="h-[calc(100vh-4rem)]">
        <PostsFeed searchQuery={searchQuery} />
      </main>
    </div>
  );
}
