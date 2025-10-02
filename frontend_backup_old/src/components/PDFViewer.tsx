import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Download, ZoomIn, ZoomOut, RotateCw, FileText, ChevronLeft, ChevronRight } from 'lucide-react'

interface PDFViewerProps {
  pdfUrl?: string
  pdfData?: string // Base64 encoded PDF data
  title?: string
  height?: string
  showToolbar?: boolean
  onError?: (error: Error) => void
}

export default function PDFViewer({
  pdfUrl,
  pdfData,
  title = 'Document Preview',
  height = '600px',
  showToolbar = true,
  onError
}: PDFViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pdfSrc, setPdfSrc] = useState<string>('')

  useEffect(() => {
    if (pdfData) {
      // Convert base64 to blob URL
      try {
        const byteCharacters = atob(pdfData)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setPdfSrc(url)
        
        return () => {
          URL.revokeObjectURL(url)
        }
      } catch (err) {
        setError('Failed to load PDF data')
        if (onError) onError(err as Error)
      }
    } else if (pdfUrl) {
      setPdfSrc(pdfUrl)
    }
  }, [pdfData, pdfUrl, onError])

  const handleLoad = () => {
    setLoading(false)
    setError(null)
  }

  const handleError = () => {
    setLoading(false)
    setError('Failed to load PDF document')
    if (onError) onError(new Error('PDF loading failed'))
  }

  const handleZoomIn = () => {
    setScale(Math.min(scale + 0.25, 3))
  }

  const handleZoomOut = () => {
    setScale(Math.max(scale - 0.25, 0.5))
  }

  const handleRotate = () => {
    setRotation((rotation + 90) % 360)
  }

  const handleDownload = () => {
    if (pdfSrc) {
      const link = document.createElement('a')
      link.href = pdfSrc
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Fallback to iframe for simpler PDF viewing
  const useFallbackViewer = true // Set to true to use simpler iframe approach

  if (useFallbackViewer) {
    return (
      <Card className="overflow-hidden">
        {showToolbar && (
          <div className="bg-gray-50 border-b px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">{title}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={!pdfSrc || loading}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        )}
        
        <div className="relative" style={{ height }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600">Loading PDF...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 p-4">
              <Alert className="max-w-md">
                <AlertDescription className="text-red-600">
                  {error}
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          {pdfSrc && (
            <iframe
              src={`${pdfSrc}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full border-0"
              onLoad={handleLoad}
              onError={handleError}
              title={title}
            />
          )}
        </div>
      </Card>
    )
  }

  // Advanced viewer with controls (requires additional PDF.js integration)
  return (
    <Card className="overflow-hidden">
      {showToolbar && (
        <div className="bg-gray-50 border-b px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">{title}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Zoom controls */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600 px-2">{Math.round(scale * 100)}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={scale >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              {/* Rotate */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRotate}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              
              {/* Page navigation */}
              <div className="flex items-center space-x-1 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 px-2">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Download */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="ml-4"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="relative" style={{ height }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading PDF...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 p-4">
            <Alert className="max-w-md">
              <AlertDescription className="text-red-600">
                {error}
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        <div 
          className="w-full h-full overflow-auto bg-gray-100"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center center'
          }}
        >
          {/* PDF rendering would go here with PDF.js */}
          {pdfSrc && (
            <iframe
              src={`${pdfSrc}#page=${currentPage}`}
              className="w-full h-full border-0"
              onLoad={handleLoad}
              onError={handleError}
              title={title}
            />
          )}
        </div>
      </div>
    </Card>
  )
}