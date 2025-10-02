/**
 * PDF Storage Service using IndexedDB
 *
 * This service provides a solution for storing large PDF files without hitting
 * sessionStorage quota limits. It uses IndexedDB which has much higher storage
 * limits (typically 50MB+ vs 5-10MB for sessionStorage).
 */

const DB_NAME = 'OnboardingPDFStorage'
const DB_VERSION = 1
const STORE_NAME = 'pdfs'

interface StoredPDF {
  id: string
  data: string // base64 PDF data
  timestamp: number
  stepId: string
  employeeId?: string
}

class PDFStorageService {
  private db: IDBDatabase | null = null

  /**
   * Initialize the IndexedDB database
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('stepId', 'stepId', { unique: false })
          store.createIndex('employeeId', 'employeeId', { unique: false })
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  /**
   * Store a PDF in IndexedDB
   */
  async storePDF(stepId: string, pdfData: string, employeeId?: string): Promise<string> {
    try {
      const db = await this.initDB()
      const id = `${stepId}_${Date.now()}`

      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const pdfRecord: StoredPDF = {
        id,
        data: pdfData,
        timestamp: Date.now(),
        stepId,
        employeeId
      }

      await new Promise((resolve, reject) => {
        const request = store.put(pdfRecord)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      // Clean up old PDFs for this step (keep only the latest)
      await this.cleanupOldPDFs(stepId, id)

      return id
    } catch (error) {
      console.error('Failed to store PDF in IndexedDB:', error)
      // Fallback: return empty string if IndexedDB fails
      return ''
    }
  }

  /**
   * Retrieve a PDF from IndexedDB
   */
  async getPDF(pdfId: string): Promise<string | null> {
    try {
      const db = await this.initDB()
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)

      return new Promise((resolve, reject) => {
        const request = store.get(pdfId)
        request.onsuccess = () => {
          const result = request.result as StoredPDF | undefined
          resolve(result?.data || null)
        }
        request.onerror = () => {
          console.error('Failed to retrieve PDF:', request.error)
          resolve(null)
        }
      })
    } catch (error) {
      console.error('Failed to retrieve PDF from IndexedDB:', error)
      return null
    }
  }

  /**
   * Get the latest PDF for a specific step
   */
  async getLatestPDFForStep(stepId: string): Promise<string | null> {
    try {
      const db = await this.initDB()
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('stepId')

      return new Promise((resolve, reject) => {
        const request = index.openCursor(IDBKeyRange.only(stepId), 'prev')
        request.onsuccess = () => {
          const cursor = request.result
          if (cursor) {
            const pdf = cursor.value as StoredPDF
            resolve(pdf.data)
          } else {
            resolve(null)
          }
        }
        request.onerror = () => {
          console.error('Failed to retrieve PDF for step:', request.error)
          resolve(null)
        }
      })
    } catch (error) {
      console.error('Failed to retrieve PDF for step from IndexedDB:', error)
      return null
    }
  }

  /**
   * Clean up old PDFs for a step (keep only the latest)
   */
  private async cleanupOldPDFs(stepId: string, keepId: string): Promise<void> {
    try {
      const db = await this.initDB()
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('stepId')

      const request = index.openCursor(IDBKeyRange.only(stepId))
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor) {
          const pdf = cursor.value as StoredPDF
          if (pdf.id !== keepId) {
            cursor.delete()
          }
          cursor.continue()
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old PDFs:', error)
    }
  }

  /**
   * Clear all PDFs from storage (useful for logout/cleanup)
   */
  async clearAll(): Promise<void> {
    try {
      const db = await this.initDB()
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      await new Promise<void>((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to clear PDF storage:', error)
    }
  }

  /**
   * Check if IndexedDB is available
   */
  isAvailable(): boolean {
    return typeof indexedDB !== 'undefined'
  }

  /**
   * Get storage size estimate
   */
  async getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0
        }
      } catch (error) {
        console.error('Failed to get storage estimate:', error)
      }
    }
    return null
  }
}

// Export singleton instance
export const pdfStorage = new PDFStorageService()

// Helper function for components
export const savePDFToStorage = async (
  stepId: string,
  pdfData: string,
  employeeId?: string
): Promise<{ pdfId: string; stored: boolean }> => {
  if (!pdfStorage.isAvailable()) {
    console.warn('IndexedDB not available, PDF will not be persisted')
    return { pdfId: '', stored: false }
  }

  const pdfId = await pdfStorage.storePDF(stepId, pdfData, employeeId)
  return { pdfId, stored: !!pdfId }
}

export const getPDFFromStorage = async (pdfId: string): Promise<string | null> => {
  if (!pdfStorage.isAvailable()) {
    return null
  }
  return pdfStorage.getPDF(pdfId)
}

export const getLatestPDFForStep = async (stepId: string): Promise<string | null> => {
  if (!pdfStorage.isAvailable()) {
    return null
  }
  return pdfStorage.getLatestPDFForStep(stepId)
}