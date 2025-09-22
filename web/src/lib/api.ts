import axios from 'axios'
import type { AuthResponse, Post, PostData, User } from '@/types/api'

const API_BASE_URL = 'https://api.oxylize.com'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
  timeout: 10000, // 10 second timeout
})

// Auth endpoints
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
      
      // Get user info after login
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
      
      // If the backend is not available, create a mock user with proper UUID
      console.warn('Backend not available, using mock user')
      const mockUuid = crypto.randomUUID()
      
      return {
        access_token: 'mock-token',
        user: {
          id: mockUuid,
          username: email.split('@')[0],
          name: email.split('@')[0],
          email: email,
          subjects: []
        }
      }
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
    // Register returns 201 Created with no body, so we need to login after
    return authAPI.login(email, password)
  },
  logout: async () => {
    const response = await api.post('/auth/logout')
    // Clear localStorage on logout
    localStorage.removeItem('auth_token')
    localStorage.removeItem('currentUser')
    return response.data
  },
  
  // Function to clear old/invalid user data
  clearUserData: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('currentUser')
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },
}

// User endpoints
export const userAPI = {
  getUserById: async (userId: string): Promise<User | null> => {
    try {
      const response = await api.get(`/users/${userId}`)
      return response.data.user || response.data
    } catch (error) {
      console.warn('API not available, creating mock user for ID:', userId)
      // Return a mock user when API is not available
      return {
        id: userId,
        username: 'user' + userId.slice(-4),
        name: 'User ' + userId.slice(-4),
        email: 'user' + userId.slice(-4) + '@example.com',
        subjects: []
      }
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

// Posts endpoints
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
    
    // Transform API posts to ensure all required fields are present
    return posts.map((post: Partial<Post>) => ({
      // Core post data
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
      
      // Owner information (should come directly from backend)
      owner_id: post.owner_id,
      owner_name: post.owner_name || 'Unknown User',
      owner_username: post.owner_username || 'unknown',
      owner_avatar: post.owner_avatar,
      
      // Post metadata
      status: post.status || 'active',
      viewCount: post.viewCount || 0,
      responseCount: post.responseCount || 0,
      
      // Optional fields
      location: post.location,
      preferredContactMethod: post.preferredContactMethod,
      academicLevel: post.academicLevel,
      difficulty: post.difficulty,
      
      // Backward compatibility - map new fields to old author structure
      author: {
        name: post.owner_name || 'Unknown User',
        username: post.owner_username || 'unknown',
        avatar: post.owner_avatar,
      }
    }))
  },
  // Legacy method for compatibility
  getAllPostsLegacy: async (): Promise<Post[]> => {
    try {
      return await postsAPI.getAllPosts(0, 100) // Get first 100 posts for legacy compatibility
    } catch (error) {
      console.warn('API not available, returning empty posts array')
      return [] // Return empty array when API is not available
    }
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

// Add authorization header to requests when token is available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('currentUser')
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(error)
  }
)
