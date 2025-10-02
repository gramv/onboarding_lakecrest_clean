/**
 * Centralized API Configuration
 * 
 * This module provides a consistent API URL configuration that works for both
 * development (using Vite proxy) and production (using full backend URL).
 */

/**
 * Get the base API URL based on environment
 * 
 * In development: Uses '/api' prefix to work with Vite proxy
 * In production: Uses full backend URL from VITE_API_URL environment variable
 * 
 * IMPORTANT: Never use empty string as fallback - it causes relative URL issues
 */
export function getApiUrl(): string {
  const envApiUrl = import.meta.env.VITE_API_URL

  // Production: Use the full backend URL from environment variable with /api suffix
  if (envApiUrl && envApiUrl.trim() !== '') {
    // Ensure the URL ends without a trailing slash, then add /api
    const baseUrl = envApiUrl.replace(/\/$/, '')
    return `${baseUrl}/api`
  }

  // Development: Use '/api' prefix to work with Vite proxy
  // The proxy in vite.config.ts will forward these to http://localhost:8000
  return '/api'
}

/**
 * Get the base URL for non-API endpoints (like /onboarding)
 * These legacy endpoints don't use the /api prefix
 * 
 * @deprecated These should be migrated to use /api prefix
 */
export function getLegacyBaseUrl(): string {
  const envApiUrl = import.meta.env.VITE_API_URL

  // Production: Use the full backend URL from environment variable
  if (envApiUrl && envApiUrl.trim() !== '') {
    // Remove any /api suffix if present
    return envApiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
  }

  // Development: Use empty string to use relative URLs that will be proxied
  return ''
}

/**
 * Get WebSocket URL based on environment
 */
export function getWebSocketUrl(): string {
  const envApiUrl = import.meta.env.VITE_API_URL

  if (envApiUrl && envApiUrl.trim() !== '') {
    // Convert HTTP to WS protocol
    const wsUrl = envApiUrl
      .replace(/^https?:/, (match) => match === 'https:' ? 'wss:' : 'ws:')
      .replace(/\/api\/?$/, '') // Remove /api suffix if present
      .replace(/\/$/, '') // Remove trailing slash
    return `${wsUrl}/ws`
  }

  // Development: Use relative WebSocket URL that will be proxied
  return '/ws'
}

/**
 * Runtime configuration validation
 * Logs configuration issues for debugging
 */
export function validateApiConfiguration(): void {
  const apiUrl = getApiUrl()
  const legacyUrl = getLegacyBaseUrl()
  const wsUrl = getWebSocketUrl()
  
  console.info('API Configuration:', {
    apiUrl,
    legacyUrl,
    wsUrl,
    environment: import.meta.env.MODE,
    viteApiUrl: import.meta.env.VITE_API_URL || '(not set)',
  })

  // Warn if configuration seems incorrect
  if (apiUrl === '' || apiUrl === null || apiUrl === undefined) {
    console.warn('⚠️ API URL configuration issue: Base URL is empty. This may cause relative URL issues.')
  }

  if (import.meta.env.MODE === 'production' && !import.meta.env.VITE_API_URL) {
    console.warn('⚠️ Production mode detected but VITE_API_URL is not set. API calls may fail.')
  }
}

// Configuration constants
export const API_TIMEOUT = 30000 // 30 seconds
export const MAX_RETRIES = 3
export const RETRY_DELAY = 1000 // 1 second

// Export the main function as default for convenience
export default getApiUrl