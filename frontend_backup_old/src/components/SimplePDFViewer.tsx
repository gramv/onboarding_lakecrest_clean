import React from 'react'
import { Card } from '@/components/ui/card'
import { FileText } from 'lucide-react'

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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="border rounded-lg overflow-hidden bg-gray-100">
        <iframe
          src={`${pdfUrl}#zoom=${zoom}`}
          className="w-full"
          title={title}
          style={{
            height: height,
            minHeight: height,
            width: '100%'
          }}
        />
      </div>
      <div className="text-sm text-gray-600">
        <p>Tip: Use Ctrl/Cmd + Mouse Wheel to zoom in/out, or right-click for more options</p>
      </div>
    </div>
  )
}