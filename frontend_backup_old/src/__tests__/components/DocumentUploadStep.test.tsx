/**
 * Tests for DocumentUploadStep component
 * Tests document upload, OCR processing, and validation
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DocumentUploadStep from '@/pages/onboarding/DocumentUploadStep'
import { StepProps } from '@/types/form'

// Mock file upload functionality
const mockFileUpload = jest.fn()
const mockOCRProcess = jest.fn()

jest.mock('@/hooks/use-file-upload', () => ({
  useFileUpload: () => ({
    uploadFile: mockFileUpload,
    processWithOCR: mockOCRProcess,
    isUploading: false,
    uploadProgress: 0
  })
}))

describe('DocumentUploadStep', () => {
  const mockProps: StepProps = {
    currentStep: { id: 'document-upload', title: 'Document Upload' },
    progress: { stepData: {} },
    markStepComplete: jest.fn(),
    saveProgress: jest.fn(),
    language: 'en',
    employee: { id: 'emp-123', name: 'Test Employee' },
    property: { id: 'prop-123', name: 'Test Hotel' }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFileUpload.mockResolvedValue({ url: 'http://example.com/file.jpg', id: 'file-123' })
    mockOCRProcess.mockResolvedValue({ 
      text: 'John Doe\nDL: 123456789\nDOB: 01/01/1990',
      confidence: 0.95
    })
  })

  it('should render without errors', () => {
    render(<DocumentUploadStep {...mockProps} />)
    expect(screen.getByText(/upload.*documents/i)).toBeInTheDocument()
  })

  it('should display required document types', () => {
    render(<DocumentUploadStep {...mockProps} />)
    
    expect(screen.getByText(/identity.*document/i)).toBeInTheDocument()
    expect(screen.getByText(/work.*authorization/i)).toBeInTheDocument()
  })

  it('should show acceptable document list', () => {
    render(<DocumentUploadStep {...mockProps} />)
    
    // List A documents
    expect(screen.getByText(/passport/i)).toBeInTheDocument()
    
    // List B documents
    expect(screen.getByText(/driver.*license/i)).toBeInTheDocument()
    
    // List C documents
    expect(screen.getByText(/social security card/i)).toBeInTheDocument()
  })

  it('should handle file selection and upload', async () => {
    const user = userEvent.setup()
    render(<DocumentUploadStep {...mockProps} />)

    const file = new File(['test'], 'drivers-license.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/identity.*document/i)
    
    await user.upload(input, file)

    await waitFor(() => {
      expect(mockFileUpload).toHaveBeenCalledWith(file)
      expect(mockOCRProcess).toHaveBeenCalledWith('file-123')
    })
  })

  it('should validate file types', async () => {
    const user = userEvent.setup()
    render(<DocumentUploadStep {...mockProps} />)

    const invalidFile = new File(['test'], 'document.txt', { type: 'text/plain' })
    const input = screen.getByLabelText(/identity.*document/i)
    
    await user.upload(input, invalidFile)

    expect(screen.getByText(/please upload.*image.*pdf/i)).toBeInTheDocument()
    expect(mockFileUpload).not.toHaveBeenCalled()
  })

  it('should enforce file size limits', async () => {
    const user = userEvent.setup()
    render(<DocumentUploadStep {...mockProps} />)

    // Create a file larger than 10MB
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/identity.*document/i)
    
    await user.upload(input, largeFile)

    expect(screen.getByText(/file.*too large/i)).toBeInTheDocument()
    expect(mockFileUpload).not.toHaveBeenCalled()
  })

  it('should display OCR results for verification', async () => {
    const user = userEvent.setup()
    render(<DocumentUploadStep {...mockProps} />)

    const file = new File(['test'], 'drivers-license.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/identity.*document/i)
    
    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText(/extracted.*information/i)).toBeInTheDocument()
      expect(screen.getByText(/John Doe/)).toBeInTheDocument()
      expect(screen.getByText(/123456789/)).toBeInTheDocument()
    })
  })

  it('should allow manual entry if OCR fails', async () => {
    const user = userEvent.setup()
    mockOCRProcess.mockRejectedValue(new Error('OCR failed'))
    
    render(<DocumentUploadStep {...mockProps} />)

    const file = new File(['test'], 'drivers-license.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/identity.*document/i)
    
    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText(/ocr.*failed.*enter manually/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/document number/i)).toBeInTheDocument()
    })
  })

  it('should validate document combinations for I-9', async () => {
    const user = userEvent.setup()
    render(<DocumentUploadStep {...mockProps} />)

    // Upload only List B document
    const driversLicense = new File(['test'], 'dl.jpg', { type: 'image/jpeg' })
    const dlInput = screen.getByLabelText(/driver.*license/i)
    
    await user.upload(dlInput, driversLicense)

    // Try to continue without List C
    const continueButton = screen.getByRole('button', { name: /continue/i })
    await user.click(continueButton)

    expect(screen.getByText(/also.*upload.*work authorization/i)).toBeInTheDocument()
  })

  it('should accept List A document alone', async () => {
    const user = userEvent.setup()
    render(<DocumentUploadStep {...mockProps} />)

    // Upload passport (List A)
    const passport = new File(['test'], 'passport.jpg', { type: 'image/jpeg' })
    const passportInput = screen.getByLabelText(/passport/i)
    
    await user.upload(passportInput, passport)

    await waitFor(() => {
      const continueButton = screen.getByRole('button', { name: /continue/i })
      expect(continueButton).not.toBeDisabled()
    })
  })

  it('should save document metadata', async () => {
    const user = userEvent.setup()
    render(<DocumentUploadStep {...mockProps} />)

    const file = new File(['test'], 'passport.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/passport/i)
    
    await user.upload(input, file)

    // Enter document details
    const docNumberInput = screen.getByLabelText(/document number/i)
    await user.type(docNumberInput, 'P123456789')

    const expiryInput = screen.getByLabelText(/expiration date/i)
    await user.type(expiryInput, '2030-12-31')

    await waitFor(() => {
      expect(mockProps.saveProgress).toHaveBeenCalledWith('document-upload', expect.objectContaining({
        documents: expect.arrayContaining([
          expect.objectContaining({
            type: 'passport',
            fileName: 'passport.jpg',
            documentNumber: 'P123456789',
            expirationDate: '2030-12-31'
          })
        ])
      }))
    })
  })

  it('should handle multiple document uploads', async () => {
    const user = userEvent.setup()
    render(<DocumentUploadStep {...mockProps} />)

    // Upload driver's license
    const dl = new File(['test'], 'dl.jpg', { type: 'image/jpeg' })
    const dlInput = screen.getByLabelText(/driver.*license/i)
    await user.upload(dlInput, dl)

    // Upload SSN card
    const ssn = new File(['test'], 'ssn.jpg', { type: 'image/jpeg' })
    const ssnInput = screen.getByLabelText(/social security/i)
    await user.upload(ssnInput, ssn)

    await waitFor(() => {
      expect(mockFileUpload).toHaveBeenCalledTimes(2)
      expect(mockOCRProcess).toHaveBeenCalledTimes(2)
    })
  })

  it('should support Spanish language', () => {
    const spanishProps = { ...mockProps, language: 'es' as const }
    render(<DocumentUploadStep {...spanishProps} />)

    expect(screen.getByText(/cargar.*documentos/i)).toBeInTheDocument()
    expect(screen.getByText(/licencia.*conducir/i)).toBeInTheDocument()
  })

  it('should show upload progress', async () => {
    const user = userEvent.setup()
    
    // Mock slow upload
    mockFileUpload.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<DocumentUploadStep {...mockProps} />)

    const file = new File(['test'], 'large-file.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/identity.*document/i)
    
    await user.upload(input, file)

    expect(screen.getByText(/uploading/i)).toBeInTheDocument()
  })

  it('should mark step complete when all required documents uploaded', async () => {
    const user = userEvent.setup()
    render(<DocumentUploadStep {...mockProps} />)

    // Upload passport (complete List A)
    const passport = new File(['test'], 'passport.jpg', { type: 'image/jpeg' })
    const input = screen.getByLabelText(/passport/i)
    
    await user.upload(input, passport)

    const continueButton = screen.getByRole('button', { name: /continue/i })
    await user.click(continueButton)

    await waitFor(() => {
      expect(mockProps.markStepComplete).toHaveBeenCalledWith('document-upload', expect.any(Object))
    })
  })
})