import axios from 'axios'
import type { AuthResponse, Post, PostData, User, Review, CreateReviewRequest, ReviewStats } from '@/types/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.oxylize.com'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
  timeout: 10000,
})

export const authAPI = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await api.post('/auth/login', {
        credentials: {
          email: email,
          password: password
        }
      })
      
      console.log('Login response:', response.data)
      
      const userToken = response.data.token
      if (!userToken) {
        throw new Error('No token received from login')
      }
      
      const userResponse = await api.get('/user/me', {
        headers: { Authorization: `Bearer ${userToken}` }
      })
      
      console.log('User response:', userResponse.data)
      
      const userData = userResponse.data.user || userResponse.data
      
      if (!userData.id) {
        throw new Error('No user ID received from backend')
      }
      
      return {
        access_token: userToken,
        user: {
          id: userData.id,
          username: userData.username || email.split('@')[0],
          name: userData.name,
          email: userData.email || email,
          subjects: userData.subjects || []
        }
      }
    } catch (error) {
      console.error('Login API error:', error)
      throw error
    }
  },
  register: async (email: string, password: string, name: string): Promise<AuthResponse> => {
    await api.post('/auth/register', {
      username: name,
      credentials: {
        email: email,
        password: password
      }
    })
    return authAPI.login(email, password)
  },
  logout: async () => {
    const response = await api.post('/auth/logout')
    localStorage.removeItem('auth_token')
    localStorage.removeItem('currentUser')
    return response.data
  },
  clearUserData: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('currentUser')
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },
}

export const userAPI = {
  getUserById: async (userId: string): Promise<User | null> => {
    try {
      const response = await api.get(`/users/${userId}`)
      return response.data.user || response.data
    } catch (error) {
      console.error('Failed to get user:', error)
      throw error
    }
  },
  getAllUsers: async (): Promise<User[]> => {
    try {
      const response = await api.get('/users')
      return response.data.users || response.data || []
    } catch (error) {
      console.error('Failed to get users:', error)
      throw error
    }
  },
  updateUser: async (userId: string, userData: Partial<User>): Promise<User> => {
    try {
      const response = await api.put(`/users/${userId}`, userData)
      return response.data.user || response.data
    } catch (error) {
      console.error('Failed to update user:', error)
      throw error
    }
  },
}

export const postsAPI = {
  getAllPosts: async (page: number = 0, perPage: number = 10, ownerId?: string): Promise<Post[]> => {
    const params: { page: number; per_page: number; owner_id?: string } = {
      page,
      per_page: perPage
    }
    
    if (ownerId) {
      params.owner_id = ownerId
    }
    
    const response = await api.get('/posts', { params })
    const posts = response.data.posts || response.data || []
    
    return posts.map((post: Partial<Post>) => ({
      id: post.id,
      title: post.title,
      description: post.description,
      type: post.type || 'request',
      subject: post.subject || 'General',
      price: post.price || 0,
      deadline: post.deadline,
      urgent: post.urgent || false,
      createdAt: post.createdAt || new Date().toISOString(),
      updatedAt: post.updatedAt,
      
      owner_id: post.owner_id,
      owner_name: post.owner_name || 'Unknown User',
      owner_username: post.owner_username || 'unknown',
      owner_avatar: post.owner_avatar,
      
      status: post.status || 'active',
      viewCount: post.viewCount || 0,
      responseCount: post.responseCount || 0,
      
      location: post.location,
      preferredContactMethod: post.preferredContactMethod,
      academicLevel: post.academicLevel,
      difficulty: post.difficulty,
      
      author: {
        name: post.owner_name || 'Unknown User',
        username: post.owner_username || 'unknown',
        avatar: post.owner_avatar,
      }
    }))
  },
  getAllPostsLegacy: async (): Promise<Post[]> => {
    return await postsAPI.getAllPosts(0, 100)
  },
  createPost: async (postData: PostData): Promise<Post> => {
    const response = await api.post('/posts/create', {
      title: postData.title,
      description: postData.description,
      type: postData.type,
      subject: postData.subject,
      price: postData.price,
      deadline: postData.deadline ? new Date(postData.deadline).toISOString() : null,
      urgent: postData.urgent,
      location: postData.location,
      preferredContactMethod: postData.preferredContactMethod,
      academicLevel: postData.academicLevel,
      difficulty: postData.difficulty
    })
    return response.data.post || response.data
  },
  updatePost: async (id: string, postData: PostData): Promise<Post> => {
    const response = await api.put(`/posts/${id}`, {
      title: postData.title,
      description: postData.description,
      type: postData.type,
      subject: postData.subject,
      price: postData.price,
      deadline: postData.deadline ? new Date(postData.deadline).toISOString() : null,
      urgent: postData.urgent,
      location: postData.location,
      preferredContactMethod: postData.preferredContactMethod,
      academicLevel: postData.academicLevel,
      difficulty: postData.difficulty
    })
    return response.data.post || response.data
  },
  deletePost: async (id: string) => {
    const response = await api.delete(`/posts/${id}`)
    return response.data
  },
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const reviewsAPI = {
  createReview: async (reviewData: CreateReviewRequest): Promise<Review> => {
    try {
      const response = await api.post('/reviews', reviewData)
      return response.data
    } catch (error) {
      console.error('Failed to create review:', error)
      throw error
    }
  },

  getReviews: async (params?: {
    review_type?: 'post' | 'profile'
    post_id?: string
    profile_id?: string
    page?: number
    limit?: number
  }): Promise<Review[]> => {
    try {
      const response = await api.get('/reviews', { params })
      return response.data
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
      throw error
    }
  },

  deleteReview: async (reviewId: string): Promise<void> => {
    try {
      await api.delete(`/reviews/${reviewId}`)
    } catch (error) {
      console.error('Failed to delete review:', error)
      throw error
    }
  },

  getReviewStats: async (targetId: string, reviewType: 'post' | 'profile' = 'profile'): Promise<ReviewStats> => {
    try {
      const response = await api.get(`/reviews/stats/${targetId}`, {
        params: { review_type: reviewType }
      })
      return response.data
    } catch (error) {
      console.error('Failed to fetch review stats:', error)
      throw error
    }
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('currentUser')
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(error)
  }
)
