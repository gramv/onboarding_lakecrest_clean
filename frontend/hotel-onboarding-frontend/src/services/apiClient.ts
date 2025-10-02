/**
 * API Client Service
 * Centralized HTTP client for API communication
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { getApiUrl } from '../config/api'

// =====================================
// API CLIENT CONFIGURATION
// =====================================

const API_BASE_URL = getApiUrl()

// Create axios instance with default configuration
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for adding auth tokens
axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() }
    
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for handling common responses
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response time for debugging
    const endTime = new Date()
    const startTime = response.config.metadata?.startTime
    if (startTime) {
      const duration = endTime.getTime() - startTime.getTime()
      console.debug(`API Request to ${response.config.url} took ${duration}ms`)
    }
    
    return response
  },
  (error) => {
    // Handle common error responses
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          console.warn('Unauthorized access - redirecting to login')
          localStorage.removeItem('auth_token')
          window.location.href = '/login'
          break
          
        case 403:
          // Forbidden - show access denied message
          console.warn('Access forbidden:', data?.detail || 'Insufficient permissions')
          break
          
        case 404:
          // Not found
          console.warn('Resource not found:', error.config?.url)
          break
          
        case 429:
          // Rate limited
          console.warn('Rate limit exceeded - please try again later')
          break
          
        case 500:
          // Server error
          console.error('Server error:', data?.detail || 'Internal server error')
          break
          
        default:
          console.error('API Error:', status, data?.detail || error.message)
      }
    } else if (error.request) {
      // Network error
      console.error('Network error - please check your connection')
    } else {
      // Other error
      console.error('Request error:', error.message)
    }
    
    return Promise.reject(error)
  }
)

// =====================================
// API CLIENT METHODS
// =====================================

class ApiClient {
  private client: AxiosInstance

  constructor(client: AxiosInstance) {
    this.client = client
  }

  /**
   * GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config)
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config)
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config)
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config)
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config)
  }

  /**
   * Upload file
   */
  async upload<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<AxiosResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)

    return this.client.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })
  }

  /**
   * Download file
   */
  async download(url: string, filename?: string): Promise<void> {
    const response = await this.client.get(url, {
      responseType: 'blob',
    })

    // Create download link
    const blob = new Blob([response.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  }

  /**
   * Set auth token
   */
  setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token)
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  /**
   * Clear auth token
   */
  clearAuthToken(): void {
    localStorage.removeItem('auth_token')
    delete this.client.defaults.headers.common['Authorization']
  }

  /**
   * Get current auth token
   */
  getAuthToken(): string | null {
    return localStorage.getItem('auth_token')
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAuthToken()
  }
}

// =====================================
// EXPORT SINGLETON INSTANCE
// =====================================

export const apiClient = new ApiClient(axiosInstance)
export default apiClient

// =====================================
// TYPE DEFINITIONS
// =====================================

export interface ApiResponse<T = any> {
  success: boolean
  data: T
  message: string
  timestamp: string
}

export interface ApiError {
  detail: string
  code?: string
  field?: string
}

export interface PaginatedResponse<T = any> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

// Extend axios config to include metadata
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      startTime: Date
    }
  }
}