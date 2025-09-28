'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/types/api'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (user: User, token: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('auth_token')
      const userData = localStorage.getItem('currentUser')
      
      if (storedToken && userData) {
        try {
          const parsedUser = JSON.parse(userData)
          
          if (parsedUser.id && parsedUser.id.length >= 10) {
            setUser(parsedUser)
            setToken(storedToken)
          } else {
            try {
              localStorage.removeItem('auth_token')
              localStorage.removeItem('currentUser')
            } catch (e) {
              console.warn('Failed to clear invalid auth data from localStorage:', e)
            }
          }
        } catch {
          try {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('currentUser')
          } catch (e) {
            console.warn('Failed to clear corrupted auth data from localStorage:', e)
          }
        }
      }
    } catch (e) {
      console.warn('localStorage is not available or accessible:', e)
    }
    
    setIsLoading(false)
  }, [])

  const login = (userData: User, authToken: string) => {
    setUser(userData)
    setToken(authToken)
    try {
      localStorage.setItem('auth_token', authToken)
      localStorage.setItem('currentUser', JSON.stringify(userData))
    } catch (e) {
      console.warn('Failed to store auth data in localStorage:', e)
      // Continue with in-memory auth even if localStorage fails
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    try {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('currentUser')
    } catch (e) {
      console.warn('Failed to clear auth data from localStorage:', e)
    }
    router.push('/auth/login')
  }

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      logout,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
