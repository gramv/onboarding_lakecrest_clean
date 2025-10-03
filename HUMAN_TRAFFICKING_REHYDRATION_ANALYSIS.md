# Human Trafficking Rehydration - Deep Analysis

## Date: 2025-10-02
## Issue: Not rehydrating after refresh, PDF not showing after signing

---

## I-9 Rehydration Pattern (WORKING)

### Key Components:

**1. State Variables:**
```typescript
const [pdfUrl, setPdfUrl] = useState<string | null>(null)  // Base64 PDF data
const [remotePdfUrl, setRemotePdfUrl] = useState<string | null>(null)  // Supabase URL
const [documentMetadata, setDocumentMetadata] = useState<StepDocumentMetadata | null>(null)
const [isSigned, setIsSigned] = useState(false)
```

**2. Rehydration Flow (lines 138-283):**
```typescript
useEffect(() => {
  const loadData = async () => {
    // Step 1: Check if step is completed
    if (progress.completedSteps.includes(currentStep.id)) {
      setIsSigned(true)
      setFormComplete(true)
      setSupplementsComplete(true)
      setDocumentsComplete(true)
      setActiveTab('preview')  // ← IMPORTANT: Switch to preview tab
    }
    
    // Step 2: Load from session storage
    const savedData = sessionStorage.getItem(`onboarding_${currentStep.id}_data`)
    if (savedData) {
      dataToUse = JSON.parse(savedData)
      
      // Restore document metadata
      if (dataToUse.documentMetadata) {
        setDocumentMetadata(dataToUse.documentMetadata)
        if (dataToUse.documentMetadata?.signed_url) {
          setRemotePdfUrl(dataToUse.documentMetadata.signed_url)
        }
      }
      
      // Restore remote PDF URL
      if (dataToUse.remotePdfUrl) {
        setRemotePdfUrl(dataToUse.remotePdfUrl)
      }
    }
    
    // Step 3: ALWAYS fetch from cloud if employee ID exists
    if (employee?.id && !employee.id.startsWith('demo-')) {
      const response = await fetch(`${getApiUrl()}/onboarding/${employee.id}/i9-complete`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          dataToUse = result.data
          // Update session storage with cloud data
          sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify(result.data))
        }
      }
    }
    
    // Step 4: Apply loaded data
    if (dataToUse) {
      if (dataToUse.isSigned) {
        setIsSigned(dataToUse.isSigned)
        setActiveTab('preview')  // ← IMPORTANT: Switch to preview tab
      }
    }
  }
  
  loadData()
}, [currentStep.id, progress.completedSteps, employee])
```

**3. Additional Metadata Fetch (lines 291-380):**
```typescript
useEffect(() => {
  // Fetch latest I-9 document metadata from backend
  if (progress.completedSteps.includes(currentStep.id) || !remotePdfUrl) {
    fetchStepDocumentMetadata(employee.id, 'i9-section1', sessionToken)
      .then(response => {
        if (response.document_metadata?.signed_url) {
          // Verify URL is still valid
          fetch(response.document_metadata.signed_url, { method: 'HEAD' })
            .then(checkResponse => {
              if (checkResponse.ok) {
                setRemotePdfUrl(response.document_metadata.signed_url)
                setIsSigned(true)
                setFormComplete(true)
              }
            })
        }
      })
  }
}, [sessionToken, currentStep.id, employee?.id, progress.completedSteps])
```

**4. Display Logic (lines 1461-1584):**
```typescript
{isSigned ? (
  <div className="space-y-6">
    <Alert className="bg-green-50 border-green-200">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription>Form I-9 has been signed and completed successfully.</AlertDescription>
    </Alert>
    
    {renderDocumentPreview()}  // ← Shows PDF
  </div>
) : (
  <ReviewAndSign
    pdfUrl={remotePdfUrl || pdfUrl}  // ← Pass PDF URL
    ...
  />
)}

// renderDocumentPreview function:
const renderDocumentPreview = () => {
  if (pdfUrl || remotePdfUrl) {
    return (
      <PDFViewer
        pdfUrl={remotePdfUrl || documentMetadata?.signed_url || undefined}
        pdfData={!remotePdfUrl && !documentMetadata?.signed_url ? pdfUrl ?? undefined : undefined}
        height="600px"
        title="Signed I-9 Form"
      />
    )
  }
}
```

---

## Human Trafficking Current Implementation (BROKEN)

### Key Components:

**1. State Variables:**
```typescript
const [pdfUrl, setPdfUrl] = useState<string | null>(null)  // ❌ Only one PDF URL variable
const [isSigned, setIsSigned] = useState(false)
const [showReview, setShowReview] = useState(false)
const [trainingComplete, setTrainingComplete] = useState(false)
const [certificateData, setCertificateData] = useState<any>(null)
```

**2. Rehydration Flow (lines 51-142):**
```typescript
useEffect(() => {
  const loadData = async () => {
    // Step 1: Load from session storage
    const savedData = sessionStorage.getItem(`onboarding_${currentStep.id}_data`)
    if (savedData) {
      const parsed = JSON.parse(savedData)
      if (parsed.isSigned) {
        setIsSigned(true)
        setPdfUrl(parsed.pdfUrl || parsed.remotePdfUrl)  // ← Sets pdfUrl
        setTrainingComplete(true)
        setCertificateData(parsed.certificate || parsed.certificateData)
      }
    }
    
    // Step 2: If step complete but no session data, fetch from database
    if (progress.completedSteps.includes(currentStep.id) && !savedData) {
      setIsSigned(true)
      setTrainingComplete(true)
      
      // Try to fetch signed PDF from database
      if (employee?.id && !employee.id.startsWith('demo-')) {
        const response = await axios.get(
          `${getApiUrl()}/onboarding/${employee.id}/documents/human-trafficking`
        )
        
        if (response.data?.success && response.data?.data?.pdf_url) {
          setPdfUrl(response.data.data.pdf_url)  // ← Sets pdfUrl
        }
      }
    }
  }
  
  loadData()
}, [currentStep.id, progress.completedSteps, employee?.id])
```

**3. Display Logic (lines 290-313):**
```typescript
// State 1: Already signed - show PDF viewer
if (isSigned && pdfUrl) {  // ← REQUIRES BOTH isSigned AND pdfUrl
  return (
    <StepContainer>
      <div className="space-y-4">
        <div className="text-center">
          <CheckCircle />
          <h1>{t.viewCertificate}</h1>
        </div>
        
        <SimplePDFViewer pdfUrl={pdfUrl} />  // ← Shows PDF
      </div>
    </StepContainer>
  )
}

// State 2: Training complete, show review & sign
if (showReview && trainingComplete && certificateData) {
  return <ReviewAndSign ... />
}

// State 3: Show training module
return <HumanTraffickingAwareness ... />
```

---

## Problems Identified

### Problem #1: PDF URL Not Set After Signing

**In handleSign (lines 147-254):**
```typescript
const response = await axios.post(
  `${getApiUrl()}/onboarding/${employee.id}/human-trafficking/generate-pdf`,
  { employee_data: {...}, signature_data: {...} }
)

if (response.data?.success && response.data?.data) {
  remotePdfUrl = response.data.data.pdf_url  // ← Local variable
  const pdfBase64 = response.data.data.pdf
  
  // Set PDF URL for display
  setPdfUrl(`data:application/pdf;base64,${pdfBase64}`)  // ← Sets base64 data URL
}

// Save to session storage
sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify({
  ...stepData,
  isSigned: true,
  pdfUrl: remotePdfUrl,  // ← Saves Supabase URL (not base64)
  remotePdfUrl
}))
```

**Issue:** 
- `setPdfUrl()` is called with base64 data URL
- Session storage saves Supabase URL
- On rehydration, loads Supabase URL into `pdfUrl`
- SimplePDFViewer might not handle Supabase URLs correctly

### Problem #2: Missing Render Condition Check

**Current:**
```typescript
if (isSigned && pdfUrl) {  // ← BOTH must be true
  return <SimplePDFViewer pdfUrl={pdfUrl} />
}
```

**Issue:**
- If `pdfUrl` is not set (even though `isSigned` is true), falls through to training module
- No loading state while fetching PDF
- No error handling if PDF fetch fails

### Problem #3: Incomplete Rehydration

**Current rehydration:**
- Only loads from session storage OR database
- Doesn't verify if PDF URL is still valid
- Doesn't have fallback if session storage is corrupted

**I-9 rehydration:**
- Loads from session storage
- ALWAYS fetches from cloud
- Verifies PDF URL with HEAD request
- Has multiple fallbacks

### Problem #4: Session Storage Structure Mismatch

**Saved in handleSign:**
```typescript
{
  trainingComplete: true,
  certificate: certificateData,
  signed: true,
  signatureData,
  completedAt,
  isSigned: true,
  pdfUrl: remotePdfUrl,  // ← Supabase URL
  remotePdfUrl
}
```

**Loaded in useEffect:**
```typescript
if (parsed.isSigned) {
  setPdfUrl(parsed.pdfUrl || parsed.remotePdfUrl)  // ← Loads Supabase URL
  setCertificateData(parsed.certificate || parsed.certificateData)  // ← Inconsistent key
}
```

**Issue:** Key names are inconsistent (`certificate` vs `certificateData`)

---

## Required Fixes

### Fix #1: Consistent PDF URL Handling
- Use separate `pdfUrl` (base64) and `remotePdfUrl` (Supabase) like I-9
- Save both to session storage
- Display `remotePdfUrl` if available, fallback to `pdfUrl`

### Fix #2: Enhanced Rehydration
- Always fetch from cloud if employee ID exists
- Verify PDF URL is still valid
- Have loading state while fetching

### Fix #3: Proper Display Logic
- Show loading state while fetching PDF
- Show error state if PDF not found
- Don't fall through to training module if signed

### Fix #4: Consistent Session Storage Keys
- Use same keys for save and load
- Include all necessary data for rehydration

---

## Next Steps

1. Review I-9 pattern line-by-line
2. Apply same pattern to Human Trafficking
3. Test rehydration scenarios:
   - Refresh after signing
   - Clear session storage and reload
   - Navigate away and back
4. Verify PDF displays correctly in all scenarios

