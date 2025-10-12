import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  FileText, 
  Download, 
  Eye, 
  ChevronDown, 
  ChevronRight, 
  Loader2,
  FileCheck,
  Shield
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { DocumentPreviewModal } from './DocumentPreviewModal'

interface Document {
  id: string
  type: string
  name: string
  priority: number
  signed_at: string
  pdf_base64: string
  size_bytes: number
  encrypted: boolean
}

interface DocumentsViewerProps {
  employeeId: string
}

export function DocumentsViewer({ employeeId }: DocumentsViewerProps) {
  const { token } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['complete-packet']))
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [employeeId])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/manager/review/employees/${employeeId}/completed-documents`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.documents) {
        setDocuments(data.documents)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error('Error fetching documents:', err)
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const handleDownload = (doc: Document) => {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(doc.pdf_base64)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${doc.name.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download PDF:', error)
      alert('Failed to download document. Please try again.')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'N/A'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-sm text-gray-600">Loading documents...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">
          <strong>Error:</strong> {error}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDocuments}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">No documents available for this employee.</p>
      </div>
    )
  }

  // Separate complete packet from individual documents
  const completePacket = documents.find(doc => doc.type === 'final_onboarding_packet')
  const individualDocs = documents.filter(doc => doc.type !== 'final_onboarding_packet')

  return (
    <div className="space-y-4">
      {/* Complete Onboarding Packet */}
      {completePacket && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => toggleSection('complete-packet')}
          >
            <div className="flex items-center gap-3">
              {expandedSections.has('complete-packet') ? (
                <ChevronDown className="w-5 h-5 text-blue-600" />
              ) : (
                <ChevronRight className="w-5 h-5 text-blue-600" />
              )}
              <FileCheck className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="font-semibold text-blue-900">{completePacket.name}</h4>
                <p className="text-xs text-blue-700">
                  Complete onboarding package • {formatFileSize(completePacket.size_bytes)}
                  {completePacket.encrypted && (
                    <Badge variant="outline" className="ml-2 text-xs border-blue-300 text-blue-700">
                      <Shield className="w-3 h-3 mr-1" />
                      Encrypted
                    </Badge>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-700">
                {formatDate(completePacket.signed_at)}
              </span>
            </div>
          </div>

          {expandedSections.has('complete-packet') && (
            <CardContent className="pt-0 pb-4 px-4">
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-gray-600 mb-3">
                  This is the complete onboarding packet containing all signed forms and documents
                  for this employee. All sensitive information is encrypted and protected.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPreviewDocument(completePacket)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(completePacket)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Individual Documents */}
      {individualDocs.length > 0 && (
        <Card>
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('individual-docs')}
          >
            <div className="flex items-center gap-3">
              {expandedSections.has('individual-docs') ? (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-600" />
              )}
              <FileText className="w-5 h-5 text-gray-600" />
              <div>
                <h4 className="font-semibold text-gray-900">Individual Documents</h4>
                <p className="text-xs text-gray-500">{individualDocs.length} documents available</p>
              </div>
            </div>
          </div>

          {expandedSections.has('individual-docs') && (
            <CardContent className="pt-0 pb-4 px-4">
              <div className="space-y-2">
                {individualDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(doc.size_bytes)} • {formatDate(doc.signed_at)}
                          {doc.encrypted && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Encrypted
                            </Badge>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewDocument(doc)}
                        className="h-8 px-2"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        className="h-8 px-2"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Preview Modal */}
      {previewDocument && (
        <DocumentPreviewModal
          isOpen={!!previewDocument}
          onClose={() => setPreviewDocument(null)}
          documentName={previewDocument.name}
          pdfBase64={previewDocument.pdf_base64}
          onDownload={() => handleDownload(previewDocument)}
        />
      )}
    </div>
  )
}

export default DocumentsViewer

