/**
 * Avatar Upload Component
 * Professional avatar upload with image processing and default generation
 */

import React, { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Camera,
  Upload,
  User,
  Trash2,
  RotateCcw,
  Download,
  Palette,
  Crop,
  ZoomIn,
  ZoomOut,
  Move,
  Check,
  X,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ===== TYPES =====

interface AvatarUploadProps {
  currentAvatar?: string
  userName?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  onAvatarChange?: (avatarUrl: string | null) => void
  onUploadStart?: () => void
  onUploadComplete?: (url: string) => void
  onUploadError?: (error: string) => void
  allowRemove?: boolean
  allowGenerate?: boolean
  maxFileSize?: number // in MB
  acceptedFormats?: string[]
  uploadEndpoint?: string
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

// ===== AVATAR UPLOAD COMPONENT =====

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  userName = 'User',
  size = 'lg',
  className,
  onAvatarChange,
  onUploadStart,
  onUploadComplete,
  onUploadError,
  allowRemove = true,
  allowGenerate = true,
  maxFileSize = 5,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/webp'],
  uploadEndpoint = '/api/upload/avatar'
}) => {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showCropDialog, setShowCropDialog] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 })
  const [zoom, setZoom] = useState(1)

  // Get avatar size classes
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  }

  // Get user initials
  const getUserInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: `Please select a ${acceptedFormats.map(f => f.split('/')[1]).join(', ')} file.`,
        variant: 'destructive'
      })
      return
    }

    // Validate file size
    if (file.size > maxFileSize * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: `Please select a file smaller than ${maxFileSize}MB.`,
        variant: 'destructive'
      })
      return
    }

    // Read file and show crop dialog
    const reader = new FileReader()
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string)
      setShowCropDialog(true)
    }
    reader.readAsDataURL(file)
  }, [acceptedFormats, maxFileSize, toast])

  // Handle crop and upload
  const handleCropAndUpload = useCallback(async () => {
    if (!selectedImage || !canvasRef.current) return

    try {
      setIsUploading(true)
      setUploadProgress(0)
      onUploadStart?.()

      // Create image element
      const img = new Image()
      img.onload = async () => {
        const canvas = canvasRef.current!
        const ctx = canvas.getContext('2d')!
        
        // Set canvas size to crop area
        canvas.width = cropArea.width
        canvas.height = cropArea.height
        
        // Draw cropped image
        ctx.drawImage(
          img,
          cropArea.x,
          cropArea.y,
          cropArea.width,
          cropArea.height,
          0,
          0,
          cropArea.width,
          cropArea.height
        )
        
        // Convert to blob
        canvas.toBlob(async (blob) => {
          if (!blob) {
            throw new Error('Failed to process image')
          }

          // Upload to server
          const formData = new FormData()
          formData.append('avatar', blob, 'avatar.png')

          const xhr = new XMLHttpRequest()
          
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress((e.loaded / e.total) * 100)
            }
          }

          xhr.onload = () => {
            if (xhr.status === 200) {
              const response = JSON.parse(xhr.responseText)
              const avatarUrl = response.url
              
              onAvatarChange?.(avatarUrl)
              onUploadComplete?.(avatarUrl)
              
              toast({
                title: 'Success',
                description: 'Avatar updated successfully.'
              })
            } else {
              throw new Error('Upload failed')
            }
          }

          xhr.onerror = () => {
            throw new Error('Upload failed')
          }

          xhr.open('POST', uploadEndpoint)
          xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`)
          xhr.send(formData)
        }, 'image/png', 0.9)
      }
      
      img.src = selectedImage
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      onUploadError?.(errorMessage)
      
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setShowCropDialog(false)
      setSelectedImage(null)
    }
  }, [selectedImage, cropArea, uploadEndpoint, onUploadStart, onUploadComplete, onUploadError, onAvatarChange, toast])

  // Handle avatar removal
  const handleRemoveAvatar = useCallback(async () => {
    try {
      // TODO: Call API to remove avatar
      onAvatarChange?.(null)
      
      toast({
        title: 'Avatar removed',
        description: 'Your avatar has been removed.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove avatar.',
        variant: 'destructive'
      })
    }
  }, [onAvatarChange, toast])

  // Generate default avatar
  const handleGenerateAvatar = useCallback(async () => {
    try {
      // Generate a simple avatar using initials and a random color
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      
      canvas.width = 200
      canvas.height = 200
      
      // Random background color
      const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4']
      const bgColor = colors[Math.floor(Math.random() * colors.length)]
      
      // Draw background
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, 200, 200)
      
      // Draw initials
      ctx.fillStyle = 'white'
      ctx.font = 'bold 80px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(getUserInitials(userName), 100, 100)
      
      // Convert to blob and upload
      canvas.toBlob(async (blob) => {
        if (!blob) return
        
        const formData = new FormData()
        formData.append('avatar', blob, 'generated-avatar.png')
        
        // Upload generated avatar
        const response = await fetch(uploadEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        })
        
        if (response.ok) {
          const result = await response.json()
          onAvatarChange?.(result.url)
          
          toast({
            title: 'Avatar generated',
            description: 'A new avatar has been generated for you.'
          })
        }
      }, 'image/png')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate avatar.',
        variant: 'destructive'
      })
    }
  }, [userName, getUserInitials, uploadEndpoint, onAvatarChange, toast])

  return (
    <>
      <div className={cn("relative inline-block", className)}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "relative rounded-full p-0 hover:opacity-80 transition-opacity",
                sizeClasses[size]
              )}
            >
              <Avatar className={sizeClasses[size]}>
                <AvatarImage src={currentAvatar} alt={userName} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {getUserInitials(userName)}
                </AvatarFallback>
              </Avatar>
              
              {/* Upload overlay */}
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-4 w-4 text-white" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Photo
            </DropdownMenuItem>
            
            {allowGenerate && (
              <DropdownMenuItem onClick={handleGenerateAvatar}>
                <Palette className="mr-2 h-4 w-4" />
                Generate Avatar
              </DropdownMenuItem>
            )}
            
            {currentAvatar && (
              <>
                <DropdownMenuItem onClick={() => window.open(currentAvatar, '_blank')}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
                
                {allowRemove && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleRemoveAvatar} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Avatar
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Upload progress */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <div className="text-white text-xs font-medium">
              {Math.round(uploadProgress)}%
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Avatar</DialogTitle>
            <DialogDescription>
              Adjust the crop area to select the part of the image you want to use as your avatar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedImage && (
              <div className="relative">
                <img
                  src={selectedImage}
                  alt="Preview"
                  className="w-full h-64 object-contain border rounded"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center'
                  }}
                />
                
                {/* Crop overlay would go here in a real implementation */}
                <div className="absolute inset-0 border-2 border-dashed border-primary/50 rounded" />
              </div>
            )}

            {/* Zoom controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <div className="flex-1 px-2">
                <Input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Upload progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  <span className="text-sm">Uploading...</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCropDialog(false)}
              disabled={isUploading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleCropAndUpload}
              disabled={isUploading}
            >
              <Check className="h-4 w-4 mr-2" />
              Upload Avatar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </>
  )
}

// ===== EXPORTS =====

export default AvatarUpload