import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Loader2, Download, ExternalLink, FileText } from 'lucide-react'

interface MobilePDFViewerProps {
  pdfUrl?: string
  pdfData?: string
  title?: string
  height?: string
}

export default function MobilePDFViewer({
  pdfUrl,
  pdfData,
  title = 'Document Preview',
  height = '600px'
}: MobilePDFViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isMobileDevice = /iphone|ipad|ipod|android|webos|blackberry|windows phone/i.test(userAgent)
      const isSmallScreen = window.innerWidth < 768
      setIsMobile(isMobileDevice || isSmallScreen)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    let url: string | null = null

    if (pdfData) {
      try {
        console.log('MobilePDFViewer: Decoding base64 PDF data, length:', pdfData.length)
        const bytes = Uint8Array.from(atob(pdfData), c => c.charCodeAt(0))
        console.log('MobilePDFViewer: Decoded bytes, length:', bytes.length)
        const blob = new Blob([bytes], { type: 'application/pdf' })
        console.log('MobilePDFViewer: Created blob, size:', blob.size)
        url = URL.createObjectURL(blob)
        console.log('MobilePDFViewer: Created blob URL:', url)
        setBlobUrl(url)
        setError(null)
        setLoading(false)
      } catch (err) {
        console.error('MobilePDFViewer: Error rendering PDF:', err)
        setError('Unable to render PDF preview')
        setLoading(false)
      }
    } else if (pdfUrl) {
      console.log('MobilePDFViewer: Using PDF URL:', pdfUrl)
      setBlobUrl(pdfUrl)
      setError(null)
      setLoading(false)
    } else {
      console.log('MobilePDFViewer: No PDF data or URL available')
      setBlobUrl(null)
      setError('No PDF available')
      setLoading(false)
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [pdfData, pdfUrl])

  const handleDownload = () => {
    if (!blobUrl) return
    
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `${title.replace(/\s+/g, '_')}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleOpenInNewTab = () => {
    if (!blobUrl) return
    window.open(blobUrl, '_blank')
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-[clamp(1rem,2.5vw,1.25rem)] w-[clamp(1rem,2.5vw,1.25rem)] text-blue-600" />
          <span className="font-medium text-gray-900 text-[clamp(0.875rem,2.5vw,1rem)]">{title}</span>
        </div>
        
        {blobUrl && !error && !loading && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-[clamp(2rem,4vw,2.25rem)] px-[clamp(0.5rem,2vw,0.75rem)]"
            >
              <Download className="h-[clamp(0.875rem,2vw,1rem)] w-[clamp(0.875rem,2vw,1rem)]" />
              <span className="hidden sm:inline ml-2 text-[clamp(0.75rem,2vw,0.875rem)]">Download</span>
            </Button>
            {isMobile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                className="h-[clamp(2rem,4vw,2.25rem)] px-[clamp(0.5rem,2vw,0.75rem)]"
              >
                <ExternalLink className="h-[clamp(0.875rem,2vw,1rem)] w-[clamp(0.875rem,2vw,1rem)]" />
                <span className="hidden sm:inline ml-2 text-[clamp(0.75rem,2vw,0.875rem)]">Open</span>
              </Button>
            )}
          </div>
        )}
      </div>

      <div
        className="relative bg-gray-100 overflow-auto"
        style={{ 
          height: isMobile ? 'auto' : height, 
          minHeight: isMobile ? '200px' : '360px' 
        }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <Alert className="max-w-md">
              <AlertDescription className="text-red-600 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {blobUrl && !error && !loading && (
          <>
            {isMobile ? (
              // Mobile: Show message with buttons to download/open
              <div className="p-6 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-blue-100 rounded-full p-4">
                    <FileText className="h-12 w-12 text-blue-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-[clamp(1rem,3vw,1.125rem)] font-semibold text-gray-900">
                    PDF Document Ready
                  </h3>
                  <p className="text-[clamp(0.875rem,2.5vw,1rem)] text-gray-600">
                    Mobile browsers have limited PDF preview support. Please download or open in a new tab to view the document.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Button
                    type="button"
                    onClick={handleDownload}
                    className="h-[clamp(2.75rem,6vw,3rem)] px-6 text-[clamp(0.875rem,2.5vw,1rem)]"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenInNewTab}
                    className="h-[clamp(2.75rem,6vw,3rem)] px-6 text-[clamp(0.875rem,2.5vw,1rem)]"
                  >
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Open in New Tab
                  </Button>
                </div>
                <p className="text-[clamp(0.75rem,2vw,0.875rem)] text-gray-500 pt-2">
                  Tip: Opening in a new tab allows you to use your device's built-in PDF viewer
                </p>
              </div>
            ) : (
              // Desktop: Show embedded PDF
              <object
                data={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                type="application/pdf"
                className="w-full h-full"
                aria-label={title}
              >
                <iframe
                  src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                  className="w-full h-full border-0"
                  title={title}
                />
              </object>
            )}
          </>
        )}
      </div>
    </Card>
  )
}

