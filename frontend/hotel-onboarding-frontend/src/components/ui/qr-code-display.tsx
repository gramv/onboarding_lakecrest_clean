import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { QrCode, Copy, ExternalLink, Printer, RefreshCw, Download } from 'lucide-react'
import { apiClient } from '@/services/api'

interface Property {
  id: string
  name: string
  qr_code_url: string
}

interface QRCodeDisplayProps {
  property: Property
  onRegenerate?: (propertyId: string, qrData?: QRCodeData) => void
  showRegenerateButton?: boolean
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
  showRegenerateButton = true,
  className = '',
  requestPath,
}: QRCodeDisplayProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [qrData, setQrData] = useState<QRCodeData | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleRegenerateQR = async () => {
    setLoading(true)
    try {
      const path = requestPath || `/hr/properties/${property.id}/qr-code`
      const response = await apiClient.post(path, {})

      setQrData(response.data)

      if (onRegenerate) {
        onRegenerate(property.id, response.data)
      }
      
      toast({
        title: "Success",
        description: "QR code regenerated successfully"
      })
    } catch (error: any) {
      console.error('Error regenerating QR code:', error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || error.response?.data?.error || "Failed to regenerate QR code",
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
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                margin: 0;
                padding: 20px;
                background: white;
              }
              .qr-container {
                max-width: 600px;
                margin: 0 auto;
                padding: 40px;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
              }
              .property-title {
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 30px;
                color: #1f2937;
              }
              .qr-image {
                max-width: 100%;
                height: auto;
                margin: 20px 0;
              }
              .scan-text {
                font-size: 24px;
                font-weight: 600;
                margin: 30px 0 20px 0;
                color: #374151;
              }
              .url-text {
                font-size: 16px;
                color: #6b7280;
                word-break: break-all;
                margin-top: 20px;
              }
              @media print {
                body { margin: 0; padding: 0; }
                .qr-container { border: none; }
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <div class="property-title">${propertyName}</div>
              <img src="${imageUrl}" alt="QR Code" class="qr-image" />
              <div class="scan-text">Scan to Apply for Jobs</div>
              <div class="url-text">${applicationUrl}</div>
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

  const openDialog = () => {
    setIsDialogOpen(true)
    // If we don't have QR data yet, fetch it
    if (!qrData) {
      handleRegenerateQR()
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
              {showRegenerateButton && (
                <Button
                  variant="outline"
                  onClick={handleRegenerateQR}
                  disabled={loading}
                  className="flex-1 min-w-0"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Regenerate QR Code
                </Button>
              )}
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
  showRegenerateButton?: boolean
  className?: string
  scope?: 'manager' | 'hr'
}

export function QRCodeCard({ 
  property, 
  onRegenerate, 
  showRegenerateButton = true,
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
            showRegenerateButton={showRegenerateButton}
            requestPath={requestPath}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  )
}
