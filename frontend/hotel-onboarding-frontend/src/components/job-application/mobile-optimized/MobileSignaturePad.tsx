import React, { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface Point {
  x: number
  y: number
  pressure?: number
}

interface MobileSignaturePadProps {
  onSignatureChange: (signature: string | null) => void
  onClear?: () => void
  width?: string | number
  height?: number
  penColor?: string
  backgroundColor?: string
  disabled?: boolean
  className?: string
  placeholder?: string
}

export const MobileSignaturePad: React.FC<MobileSignaturePadProps> = ({
  onSignatureChange,
  onClear,
  width = '100%',
  height = 200,
  penColor = '#000000',
  backgroundColor = '#FFFFFF',
  disabled = false,
  className = '',
  placeholder = 'Sign here'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [lastPoint, setLastPoint] = useState<Point | null>(null)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size with high DPI support
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    
    ctx.scale(dpr, dpr)
    
    // Set canvas style
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    
    // Fill background
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Set drawing style
    ctx.strokeStyle = penColor
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [backgroundColor, penColor])

  // Get point from mouse/touch event
  const getPoint = (e: MouseEvent | TouchEvent): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    
    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
        pressure: (touch as any).force || 0.5
      }
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: 0.5
      }
    }
  }

  // Draw line between two points
  const drawLine = (from: Point, to: Point) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }

  // Start drawing
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return
    
    e.preventDefault()
    setIsDrawing(true)
    
    const point = getPoint(e.nativeEvent as MouseEvent | TouchEvent)
    setLastPoint(point)
  }

  // Draw
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return
    
    e.preventDefault()
    
    const point = getPoint(e.nativeEvent as MouseEvent | TouchEvent)
    
    if (lastPoint) {
      drawLine(lastPoint, point)
    }
    
    setLastPoint(point)
    setHasSignature(true)
  }

  // Stop drawing
  const stopDrawing = () => {
    if (!isDrawing) return
    
    setIsDrawing(false)
    setLastPoint(null)
    
    // Export signature
    const canvas = canvasRef.current
    if (canvas && hasSignature) {
      const signature = canvas.toDataURL('image/png')
      onSignatureChange(signature)
    }
  }

  // Clear signature
  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    setHasSignature(false)
    setLastPoint(null)
    onSignatureChange(null)
    
    if (onClear) {
      onClear()
    }
  }

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    startDrawing(e)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    draw(e)
  }

  const handleTouchEnd = () => {
    stopDrawing()
  }

  return (
    <div className={`relative ${className}`}>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className={`border-2 rounded-lg cursor-crosshair bg-white w-full ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${hasSignature ? 'border-green-500' : 'border-gray-300'}`}
        style={{ 
          width: typeof width === 'number' ? `${width}px` : width,
          height: `${height}px`,
          touchAction: 'none', // Prevent browser touch gestures
          maxWidth: '100%'
        }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />
      
      {/* Placeholder */}
      {!hasSignature && !disabled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-gray-400 text-[clamp(0.875rem,2.5vw,1rem)] italic">
            {placeholder}
          </p>
        </div>
      )}
      
      {/* Clear Button */}
      {hasSignature && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearSignature}
          className="absolute top-2 right-2 h-[clamp(2.5rem,5vw,2.75rem)] w-[clamp(2.5rem,5vw,2.75rem)] p-0 bg-white/90 hover:bg-white border border-gray-300"
        >
          <X className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)]" />
        </Button>
      )}
    </div>
  )
}

export default MobileSignaturePad

