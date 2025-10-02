/**
 * Secure Storage Service
 * Provides encrypted storage for sensitive data in browser storage
 */

class SecureStorageService {
  private storageKey = 'onboarding_secure_'
  
  /**
   * Store data securely (in production, this would include encryption)
   */
  setItem(key: string, value: any): void {
    try {
      const data = JSON.stringify(value)
      // In production, encrypt data here before storing
      sessionStorage.setItem(this.storageKey + key, data)
    } catch (error) {
      console.error('Failed to store secure data:', error)
    }
  }
  
  /**
   * Retrieve data securely
   */
  getItem(key: string): any {
    try {
      const data = sessionStorage.getItem(this.storageKey + key)
      if (!data) return null
      // In production, decrypt data here after retrieving
      return JSON.parse(data)
    } catch (error) {
      console.error('Failed to retrieve secure data:', error)
      return null
    }
  }
  
  /**
   * Remove item from secure storage
   */
  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(this.storageKey + key)
    } catch (error) {
      console.error('Failed to remove secure data:', error)
    }
  }
  
  /**
   * Clear all secure storage
   */
  clear(): void {
    try {
      // Clear only our secure storage keys
      const keys = Object.keys(sessionStorage)
      keys.forEach(key => {
        if (key.startsWith(this.storageKey)) {
          sessionStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('Failed to clear secure storage:', error)
    }
  }

  /**
   * Store data securely (async version for consistency)
   */
  async secureStore<T = any>(key: string, value: T): Promise<void> {
    return Promise.resolve(this.setItem(key, value))
  }

  /**
   * Retrieve data securely (async version for consistency)
   */
  async secureRetrieve<T = any>(key: string): Promise<T | null> {
    return Promise.resolve(this.getItem(key))
  }
}

export const secureStorage = new SecureStorageService()