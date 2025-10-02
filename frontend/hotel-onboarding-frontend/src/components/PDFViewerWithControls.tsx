import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface PDFViewerWithControlsProps {
  pdfUrl: string | null
  title?: string
  initialZoom?: number
}

export default function PDFViewerWithControls({ 
  pdfUrl, 
  title = 'PDF Preview',
  initialZoom = 100
}: PDFViewerWithControlsProps) {
  const [zoom, setZoom] = useState(initialZoom)
  const [isFullscreen, setIsFullscreen] = useState(false)

  if (!pdfUrl) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center text-gray-500">
          <FileText className="h-12 w-12 mb-4" />
          <p>No PDF available for preview</p>
        </div>
      </Card>
    )
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-4' : ''}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{zoom}%</span>
          <Button
            onClick={handleZoomOut}
            size="sm"
            variant="outline"
            disabled={zoom <= 50}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleZoomIn}
            size="sm"
            variant="outline"
            disabled={zoom >= 200}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            onClick={toggleFullscreen}
            size="sm"
            variant="outline"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden bg-gray-100">
        <iframe
          src={`${pdfUrl}#zoom=${zoom}`}
          className="w-full"
          title={title}
          style={{
            height: isFullscreen ? 'calc(100vh - 120px)' : '900px',
            minHeight: isFullscreen ? 'calc(100vh - 120px)' : '900px',
            width: '100%'
          }}
        />
      </div>
      
      <div className="text-sm text-gray-600">
        <p>You can also use Ctrl/Cmd + Mouse Wheel to zoom in/out within the PDF viewer</p>
      </div>
    </div>
  )
}