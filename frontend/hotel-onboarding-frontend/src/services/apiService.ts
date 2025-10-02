/**
 * API Service with Request Deduplication
 * Prevents duplicate API calls and provides caching for common requests
 */

import axios, { AxiosResponse } from 'axios'

interface CacheEntry<T = any> {
  data: T
  timestamp: number
  promise?: Promise<T>
}

class APIService {
  private cache = new Map<string, CacheEntry>()
  private pendingRequests = new Map<string, Promise<any>>()
  private readonly CACHE_DURATION = 5000 // 5 seconds - reduced for better real-time updates
  private readonly BASE_URL = '/api'

  private getAuthConfig() {
    const token = localStorage.getItem('token')
    return {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000
    }
  }

  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}${params ? JSON.stringify(params) : ''}`
  }

  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_DURATION
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; data?: any; params?: any } = {}
  ): Promise<T> {
    const { method = 'GET', data, params } = options
    const cacheKey = this.getCacheKey(endpoint, { method, data, params })

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!
    }

    // Check cache for GET requests
    if (method === 'GET') {
      const cached = this.cache.get(cacheKey)
      if (cached && this.isCacheValid(cached)) {
        return cached.data
      }
    }

    // Make the request
    const requestPromise = this.executeRequest<T>(endpoint, { method, data, params })

    // Store pending request
    this.pendingRequests.set(cacheKey, requestPromise)

    try {
      const result = await requestPromise
      
      // Cache GET requests
      if (method === 'GET') {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        })
      }

      return result
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(cacheKey)
    }
  }

  private async executeRequest<T>(
    endpoint: string, 
    options: { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; data?: any; params?: any }
  ): Promise<T> {
    const { method, data, params } = options
    const url = `${this.BASE_URL}${endpoint}`
    const config = { ...this.getAuthConfig(), params }

    let response: AxiosResponse
    
    switch (method) {
      case 'GET':
        response = await axios.get(url, config)
        break
      case 'POST':
        response = await axios.post(url, data, config)
        break
      case 'PUT':
        response = await axios.put(url, data, config)
        break
      case 'DELETE':
        response = await axios.delete(url, config)
        break
    }

    // Handle wrapped response format
    return response.data.data || response.data
  }

  // Public API methods
  async getProperties(): Promise<any[]> {
    try {
      const data = await this.makeRequest<any>('/hr/properties')
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Error fetching properties:', error)
      throw error
    }
  }

  async getManagers(): Promise<any[]> {
    try {
      const data = await this.makeRequest<any>('/hr/managers')
      const managersList = Array.isArray(data) ? data : []

      // Normalize to first assigned property for legacy consumers; preserve list via properties
      return managersList.map((manager: any) => {
        const properties: any[] = Array.isArray(manager.properties) ? manager.properties : []
        const firstProperty = properties[0] || null
        return {
          id: manager.id,
          email: manager.email,
          first_name: manager.first_name,
          last_name: manager.last_name,
          property_id: firstProperty?.id || null,
          property_name: firstProperty?.name || null,
          is_active: manager.is_active,
          created_at: manager.created_at,
          properties
        }
      })
    } catch (error) {
      console.error('Error fetching managers:', error)
      throw error
    }
  }

  async getApplications(): Promise<any[]> {
    try {
      const data = await this.makeRequest<any>('/manager/applications')
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Error fetching applications:', error)
      throw error
    }
  }

  async getEmployees(): Promise<any[]> {
    try {
      const data = await this.makeRequest<any>('/hr/employees')
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Error fetching employees:', error)
      throw error
    }
  }

  // Clear cache for specific endpoint or all
  clearCache(endpoint?: string): void {
    if (endpoint) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.startsWith(endpoint)
      )
      keysToDelete.forEach(key => this.cache.delete(key))
    } else {
      this.cache.clear()
    }
  }

  // Force refresh by clearing cache and making new request
  async refreshProperties(): Promise<any[]> {
    this.clearCache('/hr/properties')
    return this.getProperties()
  }

  async refreshManagers(): Promise<any[]> {
    this.clearCache('/hr/managers')
    return this.getManagers()
  }

  async refreshApplications(): Promise<any[]> {
    this.clearCache('/manager/applications')
    return this.getApplications()
  }

  async refreshEmployees(): Promise<any[]> {
    this.clearCache('/hr/employees')
    return this.getEmployees()
  }

  // Get cache statistics for debugging
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Export singleton instance
export const apiService = new APIService()
export default apiService