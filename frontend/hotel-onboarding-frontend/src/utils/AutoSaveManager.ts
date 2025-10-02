/**
 * AutoSaveManager - Handles automatic saving of form data every 30 seconds
 * Implements auto-save functionality from candidate-onboarding-flow spec
 */

import { SaveStatus } from '../types/onboarding'

interface AutoSaveConfig {
  interval: number // in milliseconds
  debounceDelay: number // in milliseconds
}

interface FormState {
  lastData: any
  lastSaved: Date | null
  saving: boolean
  error: string | null
  debounceTimer?: NodeJS.Timeout
}

export class AutoSaveManager {
  private intervals: { [formId: string]: NodeJS.Timeout } = {}
  private formStates: { [formId: string]: FormState } = {}
  private config: AutoSaveConfig

  constructor(config: Partial<AutoSaveConfig> = {}) {
    this.config = {
      interval: 60000, // 60 seconds default (increased from 30s)
      debounceDelay: 2000, // 2 seconds debounce
      ...config
    }
  }

  /**
   * Initialize auto-save for a form
   */
  initAutoSave(
    formId: string, 
    getFormData: () => any,
    saveFunction: (stepId: string, data: any) => Promise<void>
  ): void {
    // Clear existing auto-save if any
    this.clearAutoSave(formId)

    // Initialize form state
    this.formStates[formId] = {
      lastData: null,
      lastSaved: null,
      saving: false,
      error: null
    }

    // Set up auto-save interval
    this.intervals[formId] = setInterval(async () => {
      await this.performAutoSave(formId, getFormData, saveFunction)
    }, this.config.interval)

    console.log(`Auto-save initialized for ${formId} with ${this.config.interval/1000}s interval`)
  }

  /**
   * Perform auto-save if data has changed
   */
  private async performAutoSave(
    formId: string,
    getFormData: () => any,
    saveFunction: (stepId: string, data: any) => Promise<void>
  ): Promise<void> {
    const formState = this.formStates[formId]
    if (!formState || formState.saving) return

    try {
      const currentData = getFormData()
      
      // Skip if no data or data hasn't changed
      if (!currentData || this.isDataEqual(formState.lastData, currentData)) {
        return
      }

      // Start saving
      formState.saving = true
      formState.error = null

      await saveFunction(formId, currentData)

      // Update state on success
      // Use structuredClone for better performance if available, fallback to JSON method
      formState.lastData = typeof structuredClone !== 'undefined' 
        ? structuredClone(currentData)
        : JSON.parse(JSON.stringify(currentData))
      formState.lastSaved = new Date()
      formState.saving = false

      console.log(`Auto-saved ${formId} at ${formState.lastSaved.toISOString()}`)

    } catch (error) {
      console.error(`Auto-save failed for ${formId}:`, error)
      formState.saving = false
      formState.error = error instanceof Error ? error.message : 'Auto-save failed'
    }
  }

  /**
   * Trigger immediate save with debouncing
   */
  triggerImmediateSave(
    formId: string,
    getFormData: () => any,
    saveFunction: (stepId: string, data: any) => Promise<void>
  ): void {
    const formState = this.formStates[formId]
    if (!formState) return

    // Clear existing debounce timer
    if (formState.debounceTimer) {
      clearTimeout(formState.debounceTimer)
    }

    // Set up debounced save
    formState.debounceTimer = setTimeout(async () => {
      await this.performAutoSave(formId, getFormData, saveFunction)
    }, this.config.debounceDelay)
  }

  /**
   * Clear auto-save for a form
   */
  clearAutoSave(formId: string): void {
    // Clear interval
    if (this.intervals[formId]) {
      clearInterval(this.intervals[formId])
      delete this.intervals[formId]
    }

    // Clear debounce timer
    const formState = this.formStates[formId]
    if (formState?.debounceTimer) {
      clearTimeout(formState.debounceTimer)
    }

    // Clear form state
    delete this.formStates[formId]

    console.log(`Auto-save cleared for ${formId}`)
  }

  /**
   * Get save status for a form
   */
  getSaveStatus(formId?: string): SaveStatus {
    if (formId && this.formStates[formId]) {
      const state = this.formStates[formId]
      return {
        lastSaved: state.lastSaved,
        saving: state.saving,
        error: state.error
      }
    }

    // Return global status if no specific form ID
    const allStates = Object.values(this.formStates)
    const anySaving = allStates.some(state => state.saving)
    const latestSave = allStates.reduce((latest, state) => {
      if (!state.lastSaved) return latest
      if (!latest || state.lastSaved > latest) return state.lastSaved
      return latest
    }, null as Date | null)
    const anyError = allStates.find(state => state.error)?.error || null

    return {
      lastSaved: latestSave,
      saving: anySaving,
      error: anyError
    }
  }

  /**
   * Check if data has changed (optimized comparison)
   */
  private isDataEqual(data1: any, data2: any): boolean {
    if (data1 === data2) return true
    if (!data1 || !data2) return false
    if (typeof data1 !== 'object' || typeof data2 !== 'object') return false
    
    // Quick check: compare number of keys
    const keys1 = Object.keys(data1)
    const keys2 = Object.keys(data2)
    if (keys1.length !== keys2.length) return false
    
    // Deep comparison only if key counts match
    return JSON.stringify(data1) === JSON.stringify(data2)
  }

  /**
   * Update last saved time (for manual saves)
   */
  updateLastSaved(formId: string, data?: any): void {
    const formState = this.formStates[formId]
    if (formState) {
      formState.lastSaved = new Date()
      if (data) {
        // Use structuredClone for better performance if available, fallback to JSON method
        formState.lastData = typeof structuredClone !== 'undefined'
          ? structuredClone(data)
          : JSON.parse(JSON.stringify(data))
      }
      formState.error = null
    }
  }

  /**
   * Set error state for a form
   */
  setError(formId: string, error: string): void {
    const formState = this.formStates[formId]
    if (formState) {
      formState.error = error
      formState.saving = false
    }
  }

  /**
   * Check if any forms have changes since last save
   */
  hasUnsavedChanges(): boolean {
    return Object.values(this.formStates).some(state => 
      state.lastData && !state.lastSaved
    )
  }

  /**
   * Get all active form IDs
   */
  getActiveFormIds(): string[] {
    return Object.keys(this.intervals)
  }

  /**
   * Clean up all auto-save instances
   */
  destroy(): void {
    Object.keys(this.intervals).forEach(formId => {
      this.clearAutoSave(formId)
    })
    console.log('AutoSaveManager destroyed')
  }
}