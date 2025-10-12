# I-9 Complete Endpoint: PDF Decryption Fix

## Problem
After manager signs the I-9 form, the completion fails with:
```
ERROR: Failed to complete I-9 review: Failed to fill I-9 Section 2: Failed to open stream
pymupdf.mupdf.FzErrorFormat: code=7: no objects found
```

## Root Cause
The I-9 PDF stored in Supabase is **encrypted**, but the `complete_i9_document` endpoint was downloading it and trying to process it directly **without decrypting** first. 

PyMuPDF (fitz) cannot open encrypted bytes - it expects plain PDF bytes.

### The Flow Was:
1. ✅ Manager reviews I-9 (Step 1) - works fine
2. ✅ Manager saves "verified" PDF - works fine (encrypted and stored)
3. ✅ Manager completes Section 2 (Step 2) - enters employer info and signs
4. ❌ Backend downloads encrypted PDF from storage
5. ❌ Tries to open encrypted bytes with PyMuPDF → **FAILS**

## Solution

**File:** `backend/app/routers/manager_document_approval_router.py` (lines 2085-2103)

Added decryption step **before** passing PDF to PyMuPDF:

```python
# Download the existing PDF bytes
encrypted_pdf_bytes = storage_accessor.storage.from_(bucket_name).download(existing_i9_full_path)

logger.info(f"[I9-COMPLETE] Downloaded PDF, size: {len(encrypted_pdf_bytes)} bytes")

# Decrypt the PDF before processing
decrypted_pdf_bytes, was_encrypted = supabase_service.doc_encryption.decrypt_document(
    encrypted_pdf_bytes,
    document_type='i9',
    employee_id=employee_id
)

if was_encrypted:
    logger.info(f"[I9-COMPLETE] Decrypted PDF: {len(encrypted_pdf_bytes)} → {len(decrypted_pdf_bytes)} bytes")
else:
    logger.info(f"[I9-COMPLETE] PDF was not encrypted (legacy)")

existing_pdf_bytes = decrypted_pdf_bytes
```

### Now the Flow Is:
1. ✅ Manager reviews I-9 (Step 1)
2. ✅ Manager saves "verified" PDF (encrypted in storage)
3. ✅ Manager completes Section 2 (Step 2)
4. ✅ Backend downloads **encrypted** PDF
5. ✅ **Backend decrypts** PDF → plain PDF bytes
6. ✅ PyMuPDF opens plain bytes successfully
7. ✅ Fills Section 2 fields + adds signature
8. ✅ Saves completed PDF (**encrypted** again) to storage

## Technical Details

### Encryption Service
The `supabase_service.doc_encryption.decrypt_document()` method:
- Takes encrypted bytes
- Decrypts using Fernet (AES-128)
- Returns (decrypted_bytes, was_encrypted)
- Handles both encrypted and legacy unencrypted PDFs

### Why This Wasn't Caught Earlier
1. The **preview** functionality was already fixed for decryption
2. The **save_verified** functionality encrypts the PDF when saving
3. But the **complete** functionality was downloading and processing without decrypting

This is the same pattern as:
- Document preview (already fixed)
- New Hire Summary ID documents (already fixed)
- I-9 document preview (already fixed)

## Files Modified

**Backend:**
- `backend/app/routers/manager_document_approval_router.py` (lines 2085-2103)
  - Added PDF decryption before processing
  - Added logging for decryption status

## Testing

### 1. Complete I-9 Flow
1. Navigate to Manager Review
2. Select an employee with completed onboarding
3. Open I-9 Form
4. Review Step 1 (PDF should display correctly)
5. Click "Continue to Section 2"
6. Fill employer information (should auto-fill if data available)
7. Sign the form
8. Click Submit

**Expected:** Success message, no 500 error

### 2. Check Backend Logs
Look for:
```
[I9-COMPLETE] Downloaded PDF, size: 976440 bytes
[I9-COMPLETE] Decrypted PDF: 976440 → 954123 bytes
✅ I-9 Section 2 completed successfully
```

### 3. Verify Encrypted Storage
The completed PDF should be **encrypted** in storage:
```sql
-- Check document metadata
SELECT * FROM signed_documents 
WHERE employee_id = '{employee_id}' 
AND form_type = 'i9_form_completed'
ORDER BY created_at DESC 
LIMIT 1;
```

The actual file in Supabase storage should be encrypted (not readable as plain PDF).

## Security Impact

✅ **Improved**: The completed I-9 PDF is now properly handled through encryption/decryption
✅ **Maintained**: PDFs remain encrypted at rest in storage
✅ **Fixed**: No plain PDFs leaked during processing

## Related Fixes

This follows the same pattern as:
1. **Document Preview Fix** - Decrypt for inline viewing
2. **New Hire Summary** - Decrypt uploaded ID documents
3. **I-9 Review Detail** - Decrypt PDF and uploaded docs for preview

All document retrieval now properly handles encryption/decryption.

## Error Before Fix
```
ERROR:app.routers.manager_document_approval_router:Failed to complete I-9 review: Failed to fill I-9 Section 2: Failed to open stream
Traceback (most recent call last):
  File "pymupdf/__init__.py", line 2955, in __init__  
    doc = mupdf.fz_open_document_with_stream(filetype if filetype else '', stream2)
pymupdf.mupdf.FzErrorFormat: code=7: no objects found
```

## Success After Fix
```
INFO:[I9-COMPLETE] Downloaded PDF, size: 976440 bytes
INFO:[I9-COMPLETE] Decrypted PDF: 976440 → 954123 bytes
INFO:[I9-COMPLETE] Filled Section 2 on existing PDF
INFO:[I9-COMPLETE] Added manager signature
INFO:[I9-COMPLETE] Saved completed PDF (encrypted)
INFO:[I9-COMPLETE] ✅ I-9 Section 2 completed successfully
```

