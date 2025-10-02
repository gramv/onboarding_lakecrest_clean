import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '@/services/api'
import axios, { AxiosError } from 'axios' // Still need for error checking

interface User {
  id: string
  email: string
  role: 'hr' | 'manager' | 'employee'
  first_name?: string
  last_name?: string
  property_id?: string
  property_ids?: string[]
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string, returnUrl?: string) => Promise<void>
  logout: () => void
  refreshUserData: () => Promise<void>
  loading: boolean
  isAuthenticated: boolean
  hasRole: (role: string) => boolean
  returnUrl: string | null
  setReturnUrl: (url: string | null) => void
}

interface LoginResponse {
  token: string
  user: User
  expires_at: string
}

interface AuthError {
  message: string
  code?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// API service handles all configuration

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [returnUrl, setReturnUrl] = useState<string | null>(null)

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token')
        const storedUser = localStorage.getItem('user')
        const storedReturnUrl = localStorage.getItem('returnUrl')

        if (storedToken && storedUser) {
          const rawUser = JSON.parse(storedUser)
          const userData = {
            ...rawUser,
            property_ids: Array.isArray(rawUser?.property_ids) ? rawUser.property_ids : []
          }
          
          // Check if token is expired
          const expiresAt = localStorage.getItem('token_expires_at')
          if (expiresAt && new Date(expiresAt) <= new Date()) {
            // Token expired, clear auth data
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('token_expires_at')
            localStorage.removeItem('returnUrl')
          } else {
            // Check if manager has property_id, if not refresh from backend
            if (userData.role === 'manager' && !userData.property_id) {
              console.log('Manager missing property_id, refreshing from backend...')
              // Set token first so API calls work
              setToken(storedToken)

              try {
                const response = await api.auth.me()
                if (response.data && response.data.property_id) {
                  const freshUserData = response.data
                  setUser(freshUserData)
                  localStorage.setItem('user', JSON.stringify(freshUserData))
                  console.log('Refreshed user data with property_id:', freshUserData.property_id)
                } else {
                  // Still no property_id, use cached data
            setUser(userData)
                }
              } catch (error) {
                console.error('Failed to refresh user data during init:', error)
                // Use cached data as fallback
                setUser(userData)
              }
            } else {
              setToken(storedToken)
              setUser(userData)
            }
          }
        }
        
        if (storedReturnUrl) {
          setReturnUrl(storedReturnUrl)
        }
      } catch (error) {
        console.error('Failed to initialize auth from localStorage:', error)
        // Clear corrupted data
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('token_expires_at')
        localStorage.removeItem('returnUrl')
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  // API service handles interceptors, but we still want to handle 401 in auth context
  useEffect(() => {
    // Listen for storage events to sync auth state across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && !e.newValue) {
        // Token was removed in another tab
        setToken(null)
        setUser(null)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const login = async (email: string, password: string, providedReturnUrl?: string): Promise<void> => {
    try {
      // Use centralized API service
      const response = await api.auth.login(email, password)
      
      // API service handles wrapped responses
      const { token: newToken, user: userData, expires_at } = response.data

      const normalizedUser: User = {
        ...userData,
        property_ids: Array.isArray(userData?.property_ids) ? userData.property_ids : []
      }
      
      // Store auth data
      setToken(newToken)
      setUser(normalizedUser)
      localStorage.setItem('token', newToken)
      localStorage.setItem('user', JSON.stringify(normalizedUser))
      localStorage.setItem('token_expires_at', expires_at)
      
      // Handle return URL
      const targetReturnUrl = providedReturnUrl || returnUrl
      if (targetReturnUrl) {
        // Clear return URL from state and storage
        setReturnUrl(null)
        localStorage.removeItem('returnUrl')
        
        // Navigate to return URL after successful login
        window.location.href = targetReturnUrl
      }
      
    } catch (error) {
      console.error('Login failed:', error)
      
      // Handle different error types
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ detail: string }>
        
        if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR') {
          throw new Error('Unable to connect to server. Please check your connection and try again.')
        }
        
        if (axiosError.response?.status === 401) {
          throw new Error('Invalid email or password')
        }
        
        if (axiosError.response?.status === 400) {
          throw new Error(axiosError.response.data?.detail || 'Invalid request')
        }
        
        if (axiosError.response?.status && axiosError.response.status >= 500) {
          throw new Error('Server error. Please try again later.')
        }
        
        throw new Error(axiosError.response?.data?.detail || 'Login failed')
      }
      
      throw new Error('An unexpected error occurred')
    }
  }

  const refreshUserData = async (): Promise<void> => {
    try {
      // Fetch fresh user data from the backend
      const response = await api.auth.me()

      if (response.data) {
        const freshUserData = response.data

        // Update state and localStorage with fresh data
        setUser(freshUserData)
        localStorage.setItem('user', JSON.stringify(freshUserData))

        console.log('User data refreshed:', freshUserData)
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error)

      // If refresh fails due to auth issues, logout
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        logout()
      }
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('token_expires_at')
    // Don't clear returnUrl on logout - it should persist for re-login
    // API service handles auth headers via localStorage
  }

  const hasRole = (role: string): boolean => {
    return user?.role === role
  }

  const isAuthenticated = Boolean(token && user)

  const value = {
    user,
    token,
    login,
    logout,
    refreshUserData,
    loading,
    isAuthenticated,
    hasRole,
    returnUrl,
    setReturnUrl
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
