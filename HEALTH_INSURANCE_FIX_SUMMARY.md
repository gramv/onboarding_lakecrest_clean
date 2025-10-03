# Health Insurance Module - PDF Generation & Signed Document Display Fix

## Issues Fixed

### 1. PDF Generation Failure ❌ → ✅
**Problem:** Health Insurance PDF generation was failing with `[Errno 32] Broken pipe` error

**Root Cause:** In `backend/app/health_insurance_overlay.py` line 1109, the code was using:
```python
doc.save(pdf_buffer)
pdf_bytes = pdf_buffer.getvalue()
```

**Solution:** Changed to use `doc.write()` directly (consistent with other PDF generators):
```python
# ✅ FIX: Use doc.write() instead of doc.save() to avoid broken pipe error
pdf_bytes = doc.write()
```

**File Changed:** `backend/app/health_insurance_overlay.py` (line 1109)

---

### 2. Signed PDF Not Saved to Database ❌ → ✅
**Problem:** Signed health insurance PDFs were not being saved to Supabase Storage

**Root Cause:** The `create_pdf_response` method in `base_pdf_generator.py` was only returning `pdf_base64` but the `save_signed_document` method expected `pdf_bytes`

**Solution:** Added `pdf_bytes` to the response dictionary:
```python
return {
    'success': True,
    'pdf_base64': self.pdf_to_base64(pdf_bytes),
    'pdf_bytes': pdf_bytes,  # ✅ FIX: Include raw bytes for save_signed_document
    'filename': filename or f"document_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
    'content_type': 'application/pdf',
    'size': len(pdf_bytes)
}
```

**File Changed:** `backend/app/services/base_pdf_generator.py` (line 412)

---

### 3. Signed PDF Not Displayed After Signing ❌ → ✅
**Problem:** After signing the health insurance form, users only saw a simple success message instead of the signed PDF preview

**Root Cause:** The HealthInsuranceStep component was missing:
1. State variable to store the PDF URL
2. Logic to capture the signed PDF from backend response
3. UI section to display the signed PDF (like Direct Deposit has)

**Solution:** Implemented the same pattern used by Direct Deposit, I-9, and W-4:

#### Changes Made:

**File:** `frontend/hotel-onboarding-frontend/src/pages/onboarding/HealthInsuranceStep.tsx`

1. **Added PDFViewer import:**
```typescript
import PDFViewer from '@/components/PDFViewer'
```

2. **Added pdfUrl state:**
```typescript
const [pdfUrl, setPdfUrl] = useState<string | null>(null)
```

3. **Updated data loading to restore PDF URL:**
```typescript
if (parsed.isSigned || parsed.signed) {
  setIsSigned(true)
  setIsValid(true)
  
  // Restore PDF URL if available
  if (parsed.pdfUrl) {
    setPdfUrl(parsed.pdfUrl)
  }
}
```

4. **Updated handleDigitalSignature to capture signed PDF:**
```typescript
if (pdfResponse.data?.success) {
  pdfUrl = pdfResponse.data.data?.pdf_url
  const signedPdfBase64 = pdfResponse.data.data?.pdf
  
  // Set the PDF URL for display (use base64 PDF data)
  if (signedPdfBase64) {
    setPdfUrl(signedPdfBase64)
  }
}
```

5. **Added signed PDF display section (before review section):**
```typescript
// Show signed PDF if form is already signed
if (isSigned && pdfUrl) {
  return (
    <StepContainer errors={errors} saveStatus={saveStatus}>
      <StepContentWrapper>
        <div className="space-y-4 sm:space-y-6">
          {/* Completion Status */}
          <Alert className="bg-green-50 border-green-200 p-3 sm:p-4">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
            <AlertDescription className="text-sm sm:text-base text-green-800">
              {t.completionMessage}
            </AlertDescription>
          </Alert>

          {/* Signed PDF Display */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                <span>Signed Health Insurance Enrollment</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                <p className="text-xs sm:text-sm text-gray-600">
                  Your health insurance enrollment has been completed and signed.
                </p>
                <PDFViewer pdfData={pdfUrl} height="600px" />
              </div>
            </CardContent>
          </Card>
        </div>
      </StepContentWrapper>
    </StepContainer>
  )
}
```

---

## Backend Standards Compliance ✅

The Health Insurance module now follows the **same standards** as I-9, W-4, and Direct Deposit:

### 1. **Signed Document Storage**
- ✅ Only signed PDFs are saved to Supabase Storage
- ✅ Preview PDFs (without signature) are NOT saved
- ✅ Uses unified `save_signed_document()` method
- ✅ Saves to `signed_documents` table with proper metadata
- ✅ Property-based storage paths for multi-tenancy

### 2. **Signature Detection**
```python
has_signature = False
signature_data = employee_data.get("signatureData")

if signature_data:
    if isinstance(signature_data, dict):
        has_signature = bool(
            signature_data.get('signature') or
            signature_data.get('signedAt') or
            signature_data.get('signed_at')
        )
    elif isinstance(signature_data, str):
        has_signature = len(signature_data) > 0

if has_signature:
    # Save to Supabase Storage
    stored = await supabase_service.save_signed_document(
        employee_id=employee_id,
        property_id=property_id,
        form_type='health_insurance',
        pdf_bytes=pdf_result.get('pdf_bytes'),
        is_edit=False
    )
else:
    # Preview only - don't save
    logger.info(f"Preview PDF generated (not saved - no signature)")
```

### 3. **Response Format**
```python
return success_response(
    data={
        "pdf": pdf_base64,           # Base64 PDF for display
        "filename": filename,         # Generated filename
        "pdf_url": pdf_url           # Supabase Storage URL (if signed)
    },
    message="Health Insurance PDF generated successfully"
)
```

---

## Testing Checklist ✅

- [x] PDF generation works without errors
- [x] Preview PDF displays before signing
- [x] Signature can be drawn and submitted
- [x] Signed PDF is saved to Supabase Storage
- [x] Signed PDF displays after signing
- [x] PDF persists on page reload
- [x] Only signed PDFs are saved (previews are not)
- [x] Backend logs show successful PDF generation
- [x] Storage path follows property-based structure

---

## Files Modified

1. **Backend:**
   - `backend/app/health_insurance_overlay.py` (line 1109) - Fixed PDF generation
   - `backend/app/services/base_pdf_generator.py` (line 412) - Added pdf_bytes to response

2. **Frontend:**
   - `frontend/hotel-onboarding-frontend/src/pages/onboarding/HealthInsuranceStep.tsx` - Added signed PDF display

---

## Result

✅ **Health Insurance module now fully functional with:**
- PDF generation working correctly
- Signed PDF preview after signing
- Proper Supabase Storage integration
- Consistent with other form modules (I-9, W-4, Direct Deposit)
- Federal compliance maintained

