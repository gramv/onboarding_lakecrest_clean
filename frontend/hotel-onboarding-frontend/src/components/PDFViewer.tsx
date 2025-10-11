import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

interface PDFViewerProps {
  pdfUrl?: string
  pdfData?: string
  title?: string
  height?: string
}

export default function PDFViewer({
  pdfUrl,
  pdfData,
  title = 'Document Preview',
  height = '600px'
}: PDFViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let url: string | null = null

    if (pdfData) {
      try {
        console.log('PDFViewer: Decoding base64 PDF data, length:', pdfData.length)
        const bytes = Uint8Array.from(atob(pdfData), c => c.charCodeAt(0))
        console.log('PDFViewer: Decoded bytes, length:', bytes.length)
        const blob = new Blob([bytes], { type: 'application/pdf' })
        console.log('PDFViewer: Created blob, size:', blob.size)
        url = URL.createObjectURL(blob)
        console.log('PDFViewer: Created blob URL:', url)
        setBlobUrl(url)
        setError(null)
        setLoading(false)
      } catch (err) {
        console.error('PDFViewer: Error rendering PDF:', err)
        setError('Unable to render PDF preview')
        setLoading(false)
      }
    } else if (pdfUrl) {
      console.log('PDFViewer: Using PDF URL:', pdfUrl)
      setBlobUrl(pdfUrl)
      setError(null)
      setLoading(false)
    } else {
      console.log('PDFViewer: No PDF data or URL available')
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

  return (
    <Card className="overflow-hidden">
      <div className="bg-gray-50 border-b px-4 py-2">
        <span className="font-medium text-gray-900 text-sm">{title}</span>
      </div>

      <div
        className="relative bg-gray-100 overflow-auto"
        style={{ height, minHeight: '360px' }}
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
      </div>
    </Card>
  )
}
