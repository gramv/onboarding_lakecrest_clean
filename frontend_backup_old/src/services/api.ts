/**
 * Centralized API Service
 * Handles all API calls with proper configuration
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

// API base URL - uses Vite proxy in development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    // Handle wrapped responses (data.data pattern)
    if (response.data && response.data.data !== undefined) {
      return { ...response, data: response.data.data }
    }
    return response
  },
  (error) => {
    // Handle specific error cases
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
          break
        case 403:
          // Forbidden - user doesn't have permission
          console.error('Access denied:', error.response.data)
          break
        case 404:
          // Not found
          console.error('Resource not found:', error.response.data)
          break
        case 500:
          // Server error
          console.error('Server error:', error.response.data)
          break
      }
    }
    return Promise.reject(error)
  }
)

// API endpoints organized by feature
export const api = {
  // Authentication
  auth: {
    login: (email: string, password: string) =>
      apiClient.post('/auth/login', { email, password }),
    logout: () => apiClient.post('/auth/logout'),
    me: () => apiClient.get('/auth/me'),
    refreshToken: () => apiClient.post('/auth/refresh'),
  },

  // HR Dashboard
  hr: {
    getDashboardStats: () => apiClient.get('/hr/dashboard-stats'),
    getProperties: () => apiClient.get('/hr/properties'),
    createProperty: (data: any) => {
      // Convert to form data for backend
      const params = new URLSearchParams()
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          params.append(key, data[key].toString())
        }
      })
      return apiClient.post('/hr/properties', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    },
    updateProperty: (id: string, data: any) => {
      // Convert to form data for backend
      const params = new URLSearchParams()
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          params.append(key, data[key].toString())
        }
      })
      return apiClient.put(`/hr/properties/${id}`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    },
    deleteProperty: (id: string) => apiClient.delete(`/hr/properties/${id}`),
    getManagers: (params?: { include_inactive?: boolean }) => 
      apiClient.get('/hr/managers', { params }),
    createManager: (data: any) => {
      // Convert to form data for backend
      const params = new URLSearchParams()
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          params.append(key, data[key].toString())
        }
      })
      return apiClient.post('/hr/managers', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    },
    updateManager: (id: string, data: any) => {
      // Convert to form data for backend
      const params = new URLSearchParams()
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          params.append(key, data[key].toString())
        }
      })
      return apiClient.put(`/hr/managers/${id}`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    },
    deleteManager: (id: string) => apiClient.delete(`/hr/managers/${id}`),
    reactivateManager: (id: string) => apiClient.post(`/hr/managers/${id}/reactivate`),
    assignManagerToProperty: (propertyId: string, managerId: string) => {
      const params = new URLSearchParams()
      params.append('manager_id', managerId)
      return apiClient.post(`/hr/properties/${propertyId}/managers`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    },
    removeManagerFromProperty: (propertyId: string, managerId: string) =>
      apiClient.delete(`/hr/properties/${propertyId}/managers/${managerId}`),
    assignManager: (managerId: string, propertyId: string) => {
      const params = new URLSearchParams()
      params.append('manager_id', managerId)
      params.append('property_id', propertyId)
      return apiClient.post('/hr/managers/assign', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    },
    getEmployees: () => apiClient.get('/hr/employees'),
    getApplications: () => apiClient.get('/hr/applications'),
    getAnalytics: () => apiClient.get('/hr/analytics'),
  },

  // Manager Dashboard
  manager: {
    getDashboardStats: () => apiClient.get('/manager/dashboard-stats'),
    getMyProperty: () => apiClient.get('/manager/property'),
    getMyEmployees: () => apiClient.get('/manager/employees'),
    getApplications: () => apiClient.get('/manager/applications'),
    approveApplication: (id: string) => apiClient.post(`/manager/applications/${id}/approve`),
    rejectApplication: (id: string) => apiClient.post(`/manager/applications/${id}/reject`),
  },

  // Employee Onboarding
  onboarding: {
    validateToken: (token: string) => apiClient.post('/onboarding/validate-token', { token }),
    getSession: () => apiClient.get('/onboarding/session'),
    saveStep: (stepId: string, data: any) => apiClient.post(`/onboarding/step/${stepId}/save`, data),
    completeStep: (stepId: string, data: any) => apiClient.post(`/onboarding/step/${stepId}/complete`, data),
    submit: () => apiClient.post('/onboarding/submit'),
    uploadDocument: (formData: FormData) =>
      apiClient.post('/onboarding/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
  },

  // I-9 Forms
  i9: {
    saveSection1: (employeeId: string, data: any) =>
      apiClient.post(`/onboarding/${employeeId}/i9-section1`, data),
    getSection1: (employeeId: string) =>
      apiClient.get(`/onboarding/${employeeId}/i9-section1`),
    generatePDF: (employeeId: string, data: any) =>
      apiClient.post(`/onboarding/${employeeId}/i9-section1/generate-pdf`, data),
  },

  // W-4 Forms
  w4: {
    save: (employeeId: string, data: any) =>
      apiClient.post(`/onboarding/${employeeId}/w4-form`, data),
    get: (employeeId: string) =>
      apiClient.get(`/onboarding/${employeeId}/w4-form`),
    generatePDF: (employeeId: string, data: any) =>
      apiClient.post(`/onboarding/${employeeId}/w4-form/generate-pdf`, data),
  },

  // Job Applications
  applications: {
    submit: (data: any) => apiClient.post('/applications/submit', data),
    getByProperty: (propertyId: string) => apiClient.get(`/applications/property/${propertyId}`),
    getById: (id: string) => apiClient.get(`/applications/${id}`),
    updateStatus: (id: string, status: string) =>
      apiClient.put(`/applications/${id}/status`, { status }),
  },

  // Properties (public endpoints)
  properties: {
    getPublic: () => apiClient.get('/properties/public'),
    getById: (id: string) => apiClient.get(`/properties/${id}`),
  },

  // Document Processing
  documents: {
    processOCR: (formData: FormData) =>
      apiClient.post('/documents/process-ocr', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    upload: (formData: FormData) =>
      apiClient.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    download: (documentId: string) =>
      apiClient.get(`/documents/${documentId}/download`, { responseType: 'blob' }),
  },

  // WebSocket connection info
  websocket: {
    getConnectionInfo: () => apiClient.get('/ws/connection-info'),
  },
}

// Export the raw client for custom requests
export { apiClient }

// Export default API object
export default api