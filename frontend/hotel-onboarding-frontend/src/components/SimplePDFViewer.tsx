import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, ExternalLink } from 'lucide-react'

interface SimplePDFViewerProps {
  pdfUrl: string | null
  title?: string
  height?: string
  zoom?: number
}

export default function SimplePDFViewer({
  pdfUrl,
  title = 'PDF Preview',
  height = '800px',
  zoom = 150
}: SimplePDFViewerProps) {
  const [useNativeViewer, setUseNativeViewer] = React.useState(false)

  // Detect mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  if (!pdfUrl) {
    return (
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col items-center justify-center text-gray-500">
          <FileText className="h-10 w-10 sm:h-12 sm:w-12 mb-4" />
          <p className="text-sm sm:text-base">No PDF available for preview</p>
        </div>
      </Card>
    )
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = title.replace(/\s+/g, '_') + '.pdf'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleOpenExternal = () => {
    window.open(pdfUrl, '_blank')
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-base sm:text-lg font-semibold truncate">{title}</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex-1 sm:flex-none min-h-[44px]"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="text-xs sm:text-sm">Download</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenExternal}
            className="flex-1 sm:flex-none min-h-[44px]"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            <span className="text-xs sm:text-sm">Open</span>
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-gray-100">
        <iframe
          src={`${pdfUrl}#zoom=${isMobile ? 100 : zoom}`}
          className="w-full"
          title={title}
          style={{
            height: isMobile ? '500px' : height,
            minHeight: isMobile ? '400px' : height,
            width: '100%'
          }}
          sandbox="allow-same-origin allow-scripts"
        />
      </div>

      <div className="text-xs sm:text-sm text-gray-600 px-1">
        {isMobile ? (
          <p>💡 Tap the "Open" button to view in your device's PDF viewer for better zoom and navigation</p>
        ) : (
          <p>💡 Use Ctrl/Cmd + Mouse Wheel to zoom, or right-click for more options</p>
        )}
      </div>
    </div>
  )
}