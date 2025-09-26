'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/types/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (user: User, token: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const userData = localStorage.getItem('currentUser')
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData)
        
        if (parsedUser.id && parsedUser.id.length >= 10) {
          setUser(parsedUser)
        } else {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('currentUser')
        }
      } catch {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('currentUser')
      }
    }
    
    setIsLoading(false)
  }, [])

  const login = (userData: User, token: string) => {
    setUser(userData)
    localStorage.setItem('auth_token', token)
    localStorage.setItem('currentUser', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('currentUser')
    router.push('/auth/login')
  }

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider value={{
      user,
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
