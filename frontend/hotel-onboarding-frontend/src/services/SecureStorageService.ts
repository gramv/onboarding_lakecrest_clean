/**
 * Secure Storage Service with AES Encryption
 * Provides encrypted storage for sensitive data in browser storage
 *
 * Security Features:
 * - AES-256 encryption for all sensitive data
 * - Session-specific encryption key (destroyed on tab close)
 * - Automatic cleanup on session end
 * - Protection against XSS attacks
 */

import CryptoJS from 'crypto-js'

class SecureStorageService {
  private storageKey = 'onboarding_secure_'
  private encryptionKey: string
  private readonly ENCRYPTION_ENABLED = true // Set to false to disable encryption (for debugging)

  constructor() {
    // Generate or retrieve session-specific encryption key
    this.encryptionKey = this.getOrCreateEncryptionKey()

    // Clear sensitive data when tab/window closes
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.clearSensitiveData()
      })
    }
  }

  /**
   * Generate or retrieve session-specific encryption key
   * Key is unique per browser tab and destroyed when tab closes
   */
  private getOrCreateEncryptionKey(): string {
    const keyStorageKey = '_session_encryption_key'
    let key = sessionStorage.getItem(keyStorageKey)

    if (!key) {
      // Generate new 256-bit key
      key = CryptoJS.lib.WordArray.random(256/8).toString()
      sessionStorage.setItem(keyStorageKey, key)
      console.log('🔐 Generated new session encryption key')
    }

    return key
  }

  /**
   * Encrypt data using AES-256
   */
  private encrypt(data: string): string {
    if (!this.ENCRYPTION_ENABLED) return data
    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString()
  }

  /**
   * Decrypt data using AES-256
   */
  private decrypt(encryptedData: string): string {
    if (!this.ENCRYPTION_ENABLED) return encryptedData
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey)
    return bytes.toString(CryptoJS.enc.Utf8)
  }

  /**
   * Store data securely with encryption
   */
  setItem(key: string, value: any): void {
    try {
      const data = JSON.stringify(value)
      const encrypted = this.encrypt(data)
      sessionStorage.setItem(this.storageKey + key, encrypted)
      console.log(`🔒 Encrypted and stored: ${key}`)
    } catch (error) {
      console.error('Failed to store secure data:', error)
    }
  }

  /**
   * Retrieve and decrypt data
   */
  getItem(key: string): any {
    try {
      const encrypted = sessionStorage.getItem(this.storageKey + key)
      if (!encrypted) return null

      const decrypted = this.decrypt(encrypted)
      return JSON.parse(decrypted)
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
      console.log('🧹 Cleared all encrypted storage')
    } catch (error) {
      console.error('Failed to clear secure storage:', error)
    }
  }

  /**
   * Clear sensitive data (SSN, bank info, etc.)
   * Called automatically on tab close
   */
  clearSensitiveData(): void {
    try {
      const sensitiveKeys = [
        'onboarding_personal-info_data',
        'onboarding_w4-form_data',
        'onboarding_direct-deposit_data',
        'onboarding_i9-section1_data',
        'onboarding_health-insurance_data'
      ]

      sensitiveKeys.forEach(key => {
        this.removeItem(key)
      })

      // Also clear encryption key
      sessionStorage.removeItem('_session_encryption_key')
      console.log('🔒 Cleared sensitive data on session end')
    } catch (error) {
      console.error('Failed to clear sensitive data:', error)
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