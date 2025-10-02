import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  FileText, 
  Check, 
  X, 
  AlertTriangle, 
  Download,
  Eye,
  Shield,
  Lock
} from 'lucide-react'
import { documentService, DocumentMetadata } from '@/services/documentService'
import { DocumentType } from '@/types/documents'

interface DocumentUploadProps {
  documentType: DocumentType | string
  employeeId: string
  propertyId: string
  title: string
  description?: string
  acceptedFileTypes?: string[]
  maxFileSize?: number
  onUploadComplete?: (document: DocumentMetadata) => void
  onUploadError?: (error: Error) => void
  showPreview?: boolean
  required?: boolean
  existingDocument?: DocumentMetadata
  language?: 'en' | 'es'
}

export default function DocumentUpload({
  documentType,
  employeeId,
  propertyId,
  title,
  description,
  acceptedFileTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  onUploadComplete,
  onUploadError,
  showPreview = true,
  required = false,
  existingDocument,
  language = 'en'
}: DocumentUploadProps) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedDocument, setUploadedDocument] = useState<DocumentMetadata | null>(existingDocument || null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'upload_document': 'Upload Document',
        'drag_drop': 'Drag and drop your file here, or click to browse',
        'accepted_formats': 'Accepted formats',
        'max_size': 'Maximum file size',
        'uploading': 'Uploading...',
        'upload_complete': 'Upload Complete',
        'upload_failed': 'Upload Failed',
        'file_encrypted': 'Your file is encrypted and stored securely',
        'view_document': 'View Document',
        'download_document': 'Download Document',
        'replace_document': 'Replace Document',
        'remove_document': 'Remove Document',
        'required_document': 'This document is required',
        'legal_notice': 'All documents are encrypted and stored in compliance with federal regulations',
        'retention_period': 'Retention period',
        'years': 'years'
      },
      es: {
        'upload_document': 'Cargar Documento',
        'drag_drop': 'Arrastra y suelta tu archivo aquí, o haz clic para buscar',
        'accepted_formats': 'Formatos aceptados',
        'max_size': 'Tamaño máximo del archivo',
        'uploading': 'Cargando...',
        'upload_complete': 'Carga Completa',
        'upload_failed': 'Error al Cargar',
        'file_encrypted': 'Su archivo está encriptado y almacenado de forma segura',
        'view_document': 'Ver Documento',
        'download_document': 'Descargar Documento',
        'replace_document': 'Reemplazar Documento',
        'remove_document': 'Eliminar Documento',
        'required_document': 'Este documento es requerido',
        'legal_notice': 'Todos los documentos están encriptados y almacenados de acuerdo con las regulaciones federales',
        'retention_period': 'Período de retención',
        'years': 'años'
      }
    }
    return translations[language]?.[key] || key
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = documentService.validateFile(file)
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file')
      setUploadStatus('error')
      return
    }

    // Start upload
    setUploadStatus('uploading')
    setUploadProgress(0)
    setErrorMessage('')

    try {
      // Simulate progress (in real app, use XMLHttpRequest for progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // Upload document
      const document = await documentService.uploadDocument({
        file,
        documentType,
        employeeId,
        propertyId,
        metadata: {
          originalFilename: file.name,
          uploadedFrom: 'onboarding_form'
        }
      })

      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploadStatus('success')
      setUploadedDocument(document)

      // Generate preview URL if it's an image
      if (file.type.startsWith('image/') && showPreview) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      }

      if (onUploadComplete) {
        onUploadComplete(document)
      }
    } catch (error) {
      setUploadStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed')
      if (onUploadError) {
        onUploadError(error instanceof Error ? error : new Error('Upload failed'))
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files[0]
    if (file && fileInputRef.current) {
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(file)
      fileInputRef.current.files = dataTransfer.files
      handleFileSelect({ target: { files: dataTransfer.files } } as any)
    }
  }

  const handleViewDocument = async () => {
    if (!uploadedDocument) return

    try {
      const blob = await documentService.downloadDocument({
        documentId: uploadedDocument.document_id
      })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      window.URL.revokeObjectURL(url)
    } catch (error) {
      setErrorMessage('Failed to view document')
    }
  }

  const handleDownloadDocument = async () => {
    if (!uploadedDocument) return

    try {
      await documentService.downloadAndSaveFile(
        uploadedDocument.document_id,
        uploadedDocument.original_filename
      )
    } catch (error) {
      setErrorMessage('Failed to download document')
    }
  }

  const getRetentionYears = (): number => {
    // Default retention periods by document type
    const retentionMap: Record<string, number> = {
      i9_form: 3,
      w4_form: 4,
      direct_deposit: 3,
      voided_check: 3,
      insurance_form: 6,
      company_policies: 7,
      background_check: 2
    }
    return retentionMap[documentType] || 7
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="font-semibold text-lg flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>{title}</span>
            {required && <span className="text-red-500 text-sm">*</span>}
          </h3>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>

        {/* Upload Area */}
        {!uploadedDocument ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              uploadStatus === 'error' ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-400'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedFileTypes.join(',')}
              onChange={handleFileSelect}
              className="hidden"
              id={`file-upload-${documentType}`}
            />
            
            {uploadStatus === 'idle' && (
              <label
                htmlFor={`file-upload-${documentType}`}
                className="cursor-pointer"
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">{t('drag_drop')}</p>
                <p className="text-xs text-gray-500">
                  {t('accepted_formats')}: {acceptedFileTypes.join(', ')}
                </p>
                <p className="text-xs text-gray-500">
                  {t('max_size')}: {documentService.formatFileSize(maxFileSize)}
                </p>
              </label>
            )}

            {uploadStatus === 'uploading' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <Upload className="h-8 w-8 text-blue-600 animate-pulse" />
                  <span className="text-blue-600 font-medium">{t('uploading')}</span>
                </div>
                <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="space-y-2">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                <p className="text-red-600 font-medium">{t('upload_failed')}</p>
                <p className="text-sm text-red-500">{errorMessage}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUploadStatus('idle')
                    setErrorMessage('')
                  }}
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Uploaded Document Display */
          <div className="border rounded-lg p-4 bg-green-50 border-green-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-900">
                    {uploadedDocument.original_filename || 'Document'}
                  </p>
                  <p className="text-sm text-green-700">
                    {documentService.formatFileSize(uploadedDocument.file_size)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Uploaded: {new Date(uploadedDocument.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewDocument}
                  title={t('view_document')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadDocument}
                  title={t('download_document')}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUploadedDocument(null)
                    setUploadStatus('idle')
                    setPreviewUrl('')
                  }}
                  title={t('replace_document')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Security Badge */}
            <div className="mt-3 flex items-center space-x-2 text-xs text-green-700">
              <Lock className="h-3 w-3" />
              <span>{t('file_encrypted')}</span>
            </div>
          </div>
        )}

        {/* Preview */}
        {showPreview && previewUrl && (
          <div className="mt-4">
            <img
              src={previewUrl}
              alt="Document preview"
              className="max-w-full h-auto rounded-lg border"
              style={{ maxHeight: '300px' }}
            />
          </div>
        )}

        {/* Legal Notice */}
        <Alert className="bg-blue-50 border-blue-200">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-800">
            <p className="font-medium">{t('legal_notice')}</p>
            <p className="mt-1">
              {t('retention_period')}: {getRetentionYears()} {t('years')}
            </p>
          </AlertDescription>
        </Alert>

        {/* Required Document Notice */}
        {required && !uploadedDocument && (
          <p className="text-sm text-red-600 flex items-center space-x-1">
            <AlertTriangle className="h-3 w-3" />
            <span>{t('required_document')}</span>
          </p>
        )}
      </div>
    </Card>
  )
}