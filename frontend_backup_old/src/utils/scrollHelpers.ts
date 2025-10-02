/**
 * Scroll helper utilities for improved navigation and error handling
 */

/**
 * Smoothly scroll to the top of the page
 */
export const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/**
 * Scroll to a specific element by ID
 * @param elementId - The ID of the element to scroll to
 * @param offset - Optional offset from the top (default: 100px for header)
 */
export const scrollToElement = (elementId: string, offset: number = 100) => {
  const element = document.getElementById(elementId)
  if (element) {
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset
    const offsetPosition = elementPosition - offset
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
  }
}

/**
 * Scroll to the first error in a form
 * @param errorFieldIds - Array of field IDs that have errors
 */
export const scrollToFirstError = (errorFieldIds: string[]) => {
  if (errorFieldIds.length === 0) return
  
  // Find the first visible error element
  for (const fieldId of errorFieldIds) {
    const element = document.getElementById(fieldId)
    if (element) {
      // Add a small delay to ensure error messages are rendered
      setTimeout(() => {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
        
        // Try to focus the input if it exists
        const input = element.querySelector('input, textarea, select')
        if (input instanceof HTMLElement) {
          input.focus()
        }
      }, 100)
      break
    }
  }
}

/**
 * Scroll to error message container
 * @param containerId - The ID of the error container
 */
export const scrollToErrorContainer = (containerId: string = 'error-container') => {
  const element = document.getElementById(containerId)
  if (element) {
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    })
  }
}

/**
 * Get all form fields with errors
 * @returns Array of element IDs that have errors
 */
export const getErrorFieldIds = (): string[] => {
  const errorElements = document.querySelectorAll('[aria-invalid="true"], .error, .field-error')
  return Array.from(errorElements)
    .map(el => el.id || el.closest('[id]')?.id)
    .filter(Boolean) as string[]
}