# Manager Review Document Decryption Fix

## Issues Fixed

### 1. New Hire Summary - ID Documents Not Displaying
**Problem:** In the first section of manager review (New Hire Info), uploaded ID documents were not being shown to the manager.

**Root Cause:** The backend endpoint `GET /api/manager/review/employees/{employee_id}/summary` was only returning signed URLs for encrypted documents, but signed URLs don't work for encrypted files - the browser receives encrypted bytes and can't display them.

**Solution:**
- Updated the endpoint to download and decrypt each uploaded ID document
- Added decryption logic using `supabase_service.doc_encryption.decrypt_document()`
- Converted decrypted bytes to base64 for transmission to frontend
- Updated response to include both `url` (fallback) and `data` (decrypted base64)

**Changes:**
- `backend/app/routers/manager_document_approval_router.py` (lines 566-638)
  - Downloads raw bytes from storage
  - Decrypts using employee_id and document type
  - Converts to base64
  - Returns both signed URL and decrypted data

### 2. I-9 Document Preview Not Working
**Problem:** In section 2 of manager review, the I-9 PDF was not being displayed properly.

**Root Cause:** The I-9 endpoint was only returning a signed URL (`pdfUrl`), but not decrypting the PDF. When the PDF is encrypted, the iframe cannot display it from a signed URL.

**Solution:**
- Updated the I-9 review endpoint to download and decrypt the PDF
- Added `pdfData` field containing base64-encoded decrypted PDF
- Updated PDFViewer component to accept and prefer base64 data over URLs
- Updated I9ReviewModal to pass decrypted data to viewer

**Changes:**
- `backend/app/routers/manager_document_approval_router.py` (lines 1571-1600, 1720-1733)
  - Downloads and decrypts I-9 PDF
  - Returns `pdfData` field with base64 content
- `frontend/hotel-onboarding-frontend/src/components/manager/i9/PDFViewer.tsx`
  - Added `pdfData?: string` prop
  - Uses base64 data if available, falls back to URL
- `frontend/hotel-onboarding-frontend/src/components/manager/i9/I9ReviewModal.tsx`
  - Updated interface to include `pdfData`
  - Passes `pdfData` to PDFViewer component

### 3. New Hire Summary UI Enhancement
**Problem:** ID documents were shown as simple text links, making it difficult to review them.

**Solution:**
- Replaced text list with visual image grid
- Shows thumbnail previews of each document
- Displays document type labels
- Uses decrypted base64 data for immediate viewing
- Falls back to signed URLs if decryption fails

**Changes:**
- `frontend/hotel-onboarding-frontend/src/components/manager/NewHireSummaryModal.tsx` (lines 241-304)
  - Grid layout with image previews
  - Displays decrypted images using `data:image/jpeg;base64,{data}`
  - Graceful fallback for missing images

## Technical Details

### Decryption Process
All document decryption follows this pattern:
```python
# Download encrypted bytes from storage
raw_bytes = storage_accessor.storage.from_(bucket_name).download(file_path)

# Decrypt using document encryption service
decrypted_bytes, was_encrypted = supabase_service.doc_encryption.decrypt_document(
    raw_bytes,
    document_type=document_type,
    employee_id=employee_id
)

# Convert to base64 for frontend
file_base64 = base64.b64encode(decrypted_bytes).decode('utf-8')
```

### Response Format
Both endpoints now return:
```json
{
  "uploadedDocuments": [
    {
      "id": "...",
      "document_type": "drivers_license",
      "file_name": "dl.jpg",
      "url": "https://...",          // Fallback signed URL
      "data": "base64string..."      // Decrypted base64 data
    }
  ],
  "pdfUrl": "https://...",            // Fallback PDF URL
  "pdfData": "base64string..."        // Decrypted PDF base64
}
```

### Frontend Display
The frontend now prioritizes decrypted data:
```typescript
// For images
<img src={doc.data ? `data:image/jpeg;base64,${doc.data}` : doc.url} />

// For PDFs
const displayUrl = pdfData ? `data:application/pdf;base64,${pdfData}` : pdfUrl;
<iframe src={displayUrl} />
```

## Files Modified

### Backend
1. `backend/app/routers/manager_document_approval_router.py`
   - New Hire Summary endpoint: Added document decryption (lines 566-638)
   - I-9 Review Detail endpoint: Added PDF decryption (lines 1571-1600, 1720-1733)

### Frontend
1. `frontend/hotel-onboarding-frontend/src/components/manager/NewHireSummaryModal.tsx`
   - Updated uploaded documents display with image grid
   - Added `data?: string` to document type
2. `frontend/hotel-onboarding-frontend/src/components/manager/i9/PDFViewer.tsx`
   - Added `pdfData?: string` prop
   - Updated to prefer base64 data over URL
3. `frontend/hotel-onboarding-frontend/src/components/manager/i9/I9ReviewModal.tsx`
   - Added `pdfData` to interface
   - Passes decrypted data to viewer

## Testing Steps

1. **Test New Hire Summary ID Documents:**
   - Log in as manager
   - Navigate to manager review for an employee
   - Open "New Hire Summary" section
   - Verify uploaded ID documents display as image thumbnails
   - Click on images to verify they load properly

2. **Test I-9 Document Preview:**
   - Navigate to "I-9 Form" section in manager review
   - Verify the I-9 PDF displays correctly in the left panel
   - Verify uploaded verification documents display in the right panel
   - Test zoom controls on the PDF

3. **Test Encrypted Documents:**
   - Upload new encrypted ID documents for an employee
   - Verify they decrypt and display correctly in manager review
   - Upload new encrypted I-9 PDF
   - Verify it decrypts and displays correctly

## Security Notes

- All documents remain encrypted in storage
- Decryption happens server-side only
- Decrypted data is transmitted over HTTPS
- Frontend receives base64-encoded data for immediate display
- Signed URLs are kept as fallback for legacy unencrypted documents
- Document access is still protected by manager authentication

## Performance Considerations

- Decryption happens on-demand when manager views documents
- Base64 encoding increases payload size by ~33%
- Trade-off: Slightly larger responses vs. working document preview
- Alternative: Could implement client-side decryption, but requires managing keys

## Impact

✅ **Fixed:** Managers can now view all uploaded ID documents in New Hire Summary
✅ **Fixed:** Managers can now preview I-9 PDFs properly
✅ **Improved:** Better UI for document review with image thumbnails
✅ **Improved:** Consistent decryption pattern across all review endpoints

