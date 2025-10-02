# PDF Preview Implementation Guide

This guide explains how the PDF preview functionality works in the onboarding system.

## Overview

The system now generates actual PDF forms (I-9, W-4, etc.) filled with employee data and displays them for review before signing. This ensures employees see exactly what they're signing, matching the official government forms.

## Architecture

### Backend PDF Generation
1. **PDF Templates**: Official government forms stored in `/official-forms/`
2. **PDF Service**: `pdf_forms.py` fills the official templates with employee data
3. **API Endpoints**: `/api/forms/i9/generate`, `/api/forms/w4/generate`

### Frontend Components
1. **PDFViewer**: Component that displays PDF documents in an iframe
2. **ReviewAndSign**: Enhanced to support PDF preview mode
3. **Form-specific Reviews**: I9Section1Review, W4Review configured for PDF

## Implementation Flow

```
User fills form → Data saved → User clicks "Review and Sign" → 
Backend generates PDF → Frontend displays PDF → User signs → 
Signature added to PDF → Final signed PDF stored
```

## Key Features

### 1. PDF Generation
- Uses official government PDF templates
- Fills form fields programmatically with PyMuPDF
- Maintains federal compliance requirements
- Preserves form formatting and layout

### 2. PDF Preview
- Shows filled PDF before signature
- Allows download of unsigned version
- Zoom and navigation controls
- Responsive display

### 3. Digital Signature
- Captures signature on canvas
- Adds signature image to PDF
- Includes compliance metadata (timestamp, IP)
- Creates tamper-evident signed document

## Usage Example

### Step Component Integration

```typescript
// In your step component (e.g., I9Section1Step.tsx)
import I9Section1Review from '@/components/reviews/I9Section1Review'

// When user clicks review
if (showReview && formData) {
  return (
    <I9Section1Review
      formData={formData}
      language={language}
      onSign={handleSignature}
      onBack={() => setShowReview(false)}
    />
  )
}
```

### Review Component Configuration

```typescript
// I9Section1Review.tsx
return (
  <ReviewAndSign
    formType="i9_section1"
    formData={formData}
    title="Form I-9, Section 1"
    // ... other props
    pdfEndpoint="http://localhost:8000/api/forms/i9/generate"
    usePDFPreview={true}  // Enable PDF preview
  />
)
```

## API Endpoints

### Generate I-9 PDF
```
POST /api/forms/i9/generate
Content-Type: application/json

{
  "employee_data": {
    "employee_first_name": "John",
    "employee_last_name": "Doe",
    "citizenship_status": "citizen",
    // ... all I-9 fields
  }
}

Response: PDF file (application/pdf)
```

### Generate W-4 PDF
```
POST /api/forms/w4/generate
Content-Type: application/json

{
  "employee_data": {
    "first_name": "John",
    "last_name": "Doe",
    "filing_status": "single",
    // ... all W-4 fields
  }
}

Response: PDF file (application/pdf)
```

### Add Signature to PDF
```
POST /api/forms/i9/add-signature
Content-Type: application/json

{
  "pdf_data": "base64_encoded_pdf",
  "signature": "base64_encoded_signature_image",
  "signature_type": "employee_i9",
  "page_num": 0
}

Response: Signed PDF file
```

## Federal Compliance

### I-9 Requirements
- Must use official USCIS template
- Employee completes Section 1 before first day
- Employer completes Section 2 within 3 days
- Retain for 3 years after hire or 1 year after termination

### W-4 Requirements
- Must use current year IRS template
- Employee can update at any time
- Employer must implement within 30 days
- Retain for 4 years after tax filing

## Testing

### Backend Testing
```bash
cd hotel-onboarding-backend
python test_pdf_generation.py
```

### Frontend Testing
1. Fill out I-9 or W-4 form completely
2. Click "Review and Sign"
3. Wait for PDF to load
4. Verify all data appears correctly
5. Test download button
6. Sign and verify signature appears

## Troubleshooting

### PDF Not Loading
- Check backend is running on port 8000
- Verify PyMuPDF is installed
- Check official form templates exist
- Review browser console for CORS errors

### Signature Not Appearing
- Ensure signature canvas has data
- Check base64 encoding is correct
- Verify PDF has signature fields defined

### Form Fields Not Filling
- Check field names match PDF template
- Verify data format matches expected type
- Review PyMuPDF logs for field errors

## Future Enhancements

1. **Batch PDF Generation**: Combine multiple forms into single packet
2. **PDF Annotations**: Allow adding notes/comments
3. **Version Control**: Track form template updates
4. **Offline Support**: Cache PDFs for offline viewing
5. **Advanced Signatures**: Support for initials, dates on each page