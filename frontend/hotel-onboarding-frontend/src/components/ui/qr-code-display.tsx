import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { QrCode, Copy, ExternalLink, Printer, Download } from 'lucide-react'
import { apiClient } from '@/services/api'

interface Property {
  id: string
  name: string
  qr_code_url: string
}

interface QRCodeDisplayProps {
  property: Property
  onRegenerate?: (propertyId: string, qrData?: QRCodeData) => void
  size?: 'small' | 'medium' | 'large'
  className?: string
  requestPath?: string
}

interface QRCodeData {
  qr_code_url: string
  printable_qr_url: string
  application_url: string
  property_name: string
}

export function QRCodeDisplay({
  property,
  onRegenerate,
  className = '',
  requestPath,
}: QRCodeDisplayProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [qrData, setQrData] = useState<QRCodeData | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const fetchQRCode = async () => {
    setLoading(true)
    try {
      const path = requestPath || `/hr/properties/${property.id}/qr-code`
      const response = await apiClient.get(path)

      setQrData(response.data)

      if (onRegenerate) {
        onRegenerate(property.id, response.data)
      }
    } catch (error: any) {
      console.error('Error fetching QR code:', error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || error.response?.data?.error || "Failed to load QR code",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      })
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow && (qrData?.printable_qr_url || property.qr_code_url)) {
      const imageUrl = qrData?.printable_qr_url || property.qr_code_url
      const propertyName = qrData?.property_name || property.name
      const applicationUrl = qrData?.application_url || `http://localhost:3000/apply/${property.id}`

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Code - ${propertyName}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }

              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                background: white;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 40px;
              }

              .container {
                max-width: 600px;
                text-align: center;
              }

              .property-name {
                font-size: 48px;
                font-weight: 700;
                color: #000;
                margin-bottom: 40px;
              }

              .hiring-text {
                font-size: 32px;
                font-weight: 600;
                color: #000;
                margin-bottom: 20px;
              }

              .qr-code {
                margin: 40px auto;
                padding: 30px;
                background: white;
                border: 3px solid #000;
                border-radius: 20px;
                display: inline-block;
              }

              .qr-code img {
                width: 350px;
                height: 350px;
                display: block;
              }

              .instruction {
                font-size: 24px;
                color: #333;
                margin-top: 30px;
                font-weight: 500;
              }

              .url {
                font-size: 16px;
                color: #666;
                margin-top: 30px;
                word-break: break-all;
              }

              @media print {
                body {
                  padding: 0;
                  margin: 0;
                }

                @page {
                  size: letter;
                  margin: 0.5in;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="property-name">${propertyName}</h1>
              <h2 class="hiring-text">We're Hiring</h2>

              <div class="qr-code">
                <img src="${imageUrl}" alt="QR Code" />
              </div>

              <p class="instruction">Scan to Apply</p>
              <p class="url">${applicationUrl}</p>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    }
  }

  const handleDownload = () => {
    const imageUrl = qrData?.printable_qr_url || property.qr_code_url
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `qr-code-${property.name.replace(/\s+/g, '-').toLowerCase()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const openDialog = async () => {
    setIsDialogOpen(true)

    // Fetch QR code from backend (will return existing or generate if doesn't exist)
    if (!property.qr_code_url || !property.qr_code_url.startsWith('data:image/png;base64,')) {
      await fetchQRCode()
    }
  }

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={openDialog}
            className={className}
            title="View QR Code"
          >
            <QrCode className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Code - {property.name}
            </DialogTitle>
            <DialogDescription>
              Share this QR code with candidates to apply for jobs at this property.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* QR Code Display */}
            <div className="text-center">
              <div className="bg-white p-6 rounded-lg border-2 border-gray-200 inline-block shadow-sm">
                {property.qr_code_url ? (
                  <img
                    src={qrData?.qr_code_url || property.qr_code_url}
                    alt="QR Code"
                    className="w-64 h-64 mx-auto"
                  />
                ) : (
                  <div className="w-64 h-64 bg-gray-100 rounded flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500">QR Code</p>
                      <p className="text-xs text-gray-400">Scan to apply</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Application URL */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Application URL</Label>
              <div className="flex items-center space-x-2">
                <Input
                  value={qrData?.application_url || `http://localhost:3000/apply/${property.id}`}
                  readOnly
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(
                    qrData?.application_url || `http://localhost:3000/apply/${property.id}`,
                    'Application URL'
                  )}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(
                    qrData?.application_url || `http://localhost:3000/apply/${property.id}`,
                    '_blank'
                  )}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="flex-1 min-w-0"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print QR Code
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                className="flex-1 min-w-0"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface QRCodeCardProps {
  property: Property
  onRegenerate?: (propertyId: string, qrData?: QRCodeData) => void
  className?: string
  scope?: 'manager' | 'hr'
}

export function QRCodeCard({
  property,
  onRegenerate,
  className = '',
  scope = 'hr'
}: QRCodeCardProps) {
  const requestPath = scope === 'manager'
    ? `/manager/properties/${property.id}/qr-code`
    : `/hr/properties/${property.id}/qr-code`

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="bg-white p-4 rounded-lg border border-gray-200 inline-block">
            {property.qr_code_url ? (
              <img
                src={property.qr_code_url}
                alt="QR Code"
                className="w-32 h-32 mx-auto"
              />
            ) : (
              <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center">
                <QrCode className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-3">Scan to apply for jobs</p>
          <QRCodeDisplay
            property={property}
            onRegenerate={onRegenerate}
            requestPath={requestPath}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  )
}
