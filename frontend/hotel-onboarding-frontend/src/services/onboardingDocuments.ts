import { getApiUrl } from '@/config/api'

interface UploadOnboardingDocumentParams {
  employeeId: string
  documentType: string
  documentCategory?: string
  file: File
}

export async function uploadOnboardingDocument({ employeeId, documentType, documentCategory, file }: UploadOnboardingDocumentParams) {
  // Get session token for authentication
  const sessionToken = sessionStorage.getItem('current_onboarding_token') || ''

  const formData = new FormData()
  formData.append('file', file)
  formData.append('document_type', documentType)
  formData.append('document_category', documentCategory ?? 'other')

  const response = await fetch(`${getApiUrl()}/onboarding/${encodeURIComponent(employeeId)}/documents/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Failed to upload document (${response.status}): ${errorText}`)
  }

  return response.json()
}

interface UploadSignedI9PdfParams {
  employeeId: string
  pdfBase64: string
  signatureData: Record<string, unknown>
  formData?: Record<string, unknown>
  documentsData?: Record<string, unknown>
}

export async function uploadSignedI9Pdf({
  employeeId,
  pdfBase64,
  signatureData,
  formData,
  documentsData
}: UploadSignedI9PdfParams) {
  // Get session token for authentication
  const sessionToken = sessionStorage.getItem('current_onboarding_token') || ''

  const payload: Record<string, unknown> = {
    pdfBase64,
    signatureData
  }

  if (formData) {
    payload.formData = formData
  }

  if (documentsData) {
    payload.documentsData = documentsData
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }

  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`
  }

  const response = await fetch(`${getApiUrl()}/onboarding/${encodeURIComponent(employeeId)}/i9-complete/generate-pdf`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Failed to store signed I-9 PDF (${response.status}): ${errorText}`)
  }

  return response.json()
}
