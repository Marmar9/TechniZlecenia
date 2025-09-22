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
