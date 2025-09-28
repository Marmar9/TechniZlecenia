// API Types
export interface User {
  id: string
  username?: string
  name?: string
  email: string
  subjects?: string[]
}

export interface Post {
  id: string
  title: string
  description: string
  type: 'request' | 'offer'
  subject: string
  price: number
  deadline?: string
  urgent: boolean
  createdAt: string
  updatedAt?: string
  
  // Owner information (stored directly in post for display)
  owner_id: string
  owner_name: string
  owner_username: string
  owner_avatar?: string
  
  // Post status and metadata
  status: 'active' | 'completed' | 'cancelled'
  viewCount?: number
  responseCount?: number
  
  // Location and preferences (if applicable)
  location?: string
  preferredContactMethod?: 'email' | 'platform' | 'phone'
  
  // Academic specific fields
  academicLevel?: 'undergraduate' | 'graduate' | 'phd' | 'other'
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  
  // Deprecated fields (for backward compatibility during migration)
  /** @deprecated Use owner_name instead */
  author?: {
    name?: string
    username?: string
    avatar?: string
  }
}

export interface AuthResponse {
  access_token?: string
  token?: string
  user: User
}

export interface PostData {
  type: 'request' | 'offer'
  title: string
  description: string
  subject: string
  price: number
  deadline?: string
  urgent: boolean
  
  // Optional fields for enhanced posts
  location?: string
  preferredContactMethod?: 'email' | 'platform' | 'phone'
  academicLevel?: 'undergraduate' | 'graduate' | 'phd' | 'other'
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
}

export interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated?: (post: Post) => void
  editingPost?: Post
}

export interface Review {
  id: string
  review_sender_id: string
  review_receiver_id: string
  score: number
  comment?: string
  review_type: 'post' | 'profile'
  post_id?: string
  profile_id?: string
  created_at: string
  updated_at: string
  sender_name?: string
  sender_username?: string
}

export interface CreateReviewRequest {
  review_receiver_id: string
  score: number
  comment?: string
  review_type: 'post' | 'profile'
  post_id?: string
  profile_id?: string
}

export interface ReviewStats {
  total_reviews: number
  average_score: number
  rating_breakdown: {
    five_stars: number
    four_stars: number
    three_stars: number
    two_stars: number
    one_star: number
  }
}

// Chat Types
export interface ThreadInfo {
  id: string
  post_id: string
  post_title: string
  other_user_id: string
  other_user_name: string
  last_message?: string
  last_message_at?: string
  created_at: string
  updated_at: string
}

export interface MessageInfo {
  id: string
  thread_id: string
  sender_id: string
  sender_name: string
  content: string
  sent_at: string
}

// WebSocket Commands (Client to Server)
export type ChatCommand = 
  | {
      cmd: 'create_thread'
      post_id: string
      other_user_id: string
    }
  | {
      cmd: 'send_message'
      thread_id: string
      content: string
    }
  | {
      cmd: 'get_threads'
    }
  | {
      cmd: 'get_messages'
      thread_id: string
      limit?: number
      offset?: number
    }

// WebSocket Responses (Server to Client)
export type ChatResponse = 
  | {
      type: 'thread_created'
      thread: ThreadInfo
    }
  | {
      type: 'message_sent'
      message: MessageInfo
    }
  | {
      type: 'threads_list'
      threads: ThreadInfo[]
    }
  | {
      type: 'messages_list'
      messages: MessageInfo[]
    }
  | {
      type: 'new_message'
      message: MessageInfo
    }
  | {
      type: 'error'
      message: string
      code?: string
    }
