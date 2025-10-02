/**
 * Process signature image to remove white background and optimize for PDF embedding
 * This function runs in the browser and requires DOM APIs
 */
export async function processSignatureForPDF(signatureDataUrl: string): Promise<string> {
  // Skip processing in non-browser environments
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return signatureDataUrl
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      // Create canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      
      // Set canvas size to match image
      canvas.width = img.width
      canvas.height = img.height
      
      // Draw image
      ctx.drawImage(img, 0, 0)
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      // Find bounds of non-white pixels
      let minX = canvas.width
      let minY = canvas.height
      let maxX = 0
      let maxY = 0
      
      // Process pixels to find signature bounds and make background transparent
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]
          const a = data[idx + 3]
          
          // Check if pixel is not white/light gray (signature ink)
          // Lower threshold to catch more of the signature
          const isSignature = r < 250 || g < 250 || b < 250
          
          if (isSignature) {
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            maxX = Math.max(maxX, x)
            maxY = Math.max(maxY, y)
            
            // Make signature pure black
            // Force all signature pixels to be completely black
            data[idx] = 0         // Red = 0 (black)
            data[idx + 1] = 0     // Green = 0 (black)
            data[idx + 2] = 0     // Blue = 0 (black)
            // Ensure full opacity for signature pixels
            data[idx + 3] = 255
          } else {
            // Make white/light pixels transparent
            data[idx + 3] = 0 // Set alpha to 0
          }
        }
      }
      
      // Add padding
      const padding = 10
      minX = Math.max(0, minX - padding)
      minY = Math.max(0, minY - padding)
      maxX = Math.min(canvas.width - 1, maxX + padding)
      maxY = Math.min(canvas.height - 1, maxY + padding)
      
      // Create cropped canvas with just the signature
      const croppedCanvas = document.createElement('canvas')
      const croppedCtx = croppedCanvas.getContext('2d')
      
      if (!croppedCtx) {
        reject(new Error('Failed to get cropped canvas context'))
        return
      }
      
      const width = maxX - minX + 1
      const height = maxY - minY + 1
      
      croppedCanvas.width = width
      croppedCanvas.height = height
      
      // Put the modified image data back
      ctx.putImageData(imageData, 0, 0)
      
      // Draw the cropped region with transparent background
      croppedCtx.drawImage(
        canvas,
        minX, minY, width, height,
        0, 0, width, height
      )
      
      // Convert to PNG data URL (preserves transparency)
      const processedDataUrl = croppedCanvas.toDataURL('image/png')
      resolve(processedDataUrl)
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load signature image'))
    }
    
    img.src = signatureDataUrl
  })
}

/**
 * Get signature dimensions from data URL
 */
export async function getSignatureDimensions(signatureDataUrl: string): Promise<{width: number, height: number}> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      })
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load signature image'))
    }
    
    img.src = signatureDataUrl
  })
}