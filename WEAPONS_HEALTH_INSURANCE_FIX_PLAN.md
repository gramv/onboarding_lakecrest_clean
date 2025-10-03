# Weapons Policy & Health Insurance PDF Fixes - Detailed Plan

## Date: 2025-10-02
## Requested By: User

---

## Executive Summary

Apply the same fixes implemented for Human Trafficking PDF generation to:
1. **Weapons Policy** PDF generation
2. **Health Insurance** PDF generation

**Issues to Fix:**
1. ✅ Signature not being added to PDF (key mismatch)
2. ✅ Preview mode not working correctly
3. ✅ PDF rehydration not working (missing GET endpoints)

---

## Current State Analysis

### Weapons Policy

**Backend Endpoint:** `POST /api/onboarding/{employee_id}/weapons-policy/generate-pdf`
- **Location:** `backend/app/main_enhanced.py` (lines 13775-13951)
- **Certificate Generator:** `backend/app/weapons_policy_certificate.py`

**Current Implementation:**
```python
# Line 13824: Signature data extraction
signature_data = body.get('signature_data', {})

# Line 13827: PDF generation (ALWAYS is_preview=False)
cert = generator.generate_certificate(
    employee_data, 
    signature_data, 
    signed_date=signed_date, 
    is_preview=False  # ← PROBLEM: Always False!
)
```

**Certificate Generator (weapons_policy_certificate.py):**
```python
# Line 73: Signature check (PROBLEM: looks for 'signatureImage')
if not is_preview and signature_data.get('signatureImage'):  # ← PROBLEM!
    try:
        sig_data = signature_data['signatureImage']
        # Process signature...
```

**Issues Identified:**
1. ❌ **Signature Key Mismatch:** Generator looks for `signatureImage`, frontend sends `signature`
2. ❌ **Preview Mode:** Always `is_preview=False`, should be dynamic
3. ❌ **No GET Endpoint:** Missing `/api/onboarding/{employee_id}/documents/weapons-policy`

---

### Health Insurance

**Backend Endpoint:** `POST /api/onboarding/{employee_id}/health-insurance/generate-pdf`
- **Location:** `backend/app/main_enhanced.py` (lines 13464-13614)
- **PDF Generator:** `backend/app/generators/health_insurance_pdf_generator.py`
- **PDF Filler:** `backend/app/pdf_forms.py` (fill_health_insurance_form method)
- **Overlay:** `backend/app/health_insurance_overlay.py`

**Current Implementation:**
```python
# Line 13607: PDF generation
pdf_result = await pdf_generator.generate_pdf(
    employee_id=employee_id,
    form_data=employee_data,
    signature_data=employee_data.get('signatureData')  # ← Note: 'signatureData'
)
```

**PDF Generator (health_insurance_pdf_generator.py):**
```python
# Line 213: Calls PDF filler
pdf_bytes = self.pdf_filler.fill_health_insurance_form(employee_data)

# Line 218: Signature handling
if signature_data:
    logger.info(f"🖊️ Signature data provided - will be embedded by PDF forms layer")
```

**PDF Filler (pdf_forms.py):**
```python
# Line 959: Preview mode detection
preview = not bool(signature_b64)  # ← Checks if signature exists

# Line 968: Overlay generation
pdf_bytes = overlay.generate(
    form_data=form_data,
    employee_first=first_name,
    employee_last=last_name,
    signature_b64=signature_b64,  # ← Signature passed here
    signed_date=signed_date,
    preview=preview,  # ← Dynamic preview mode
    return_details=False
)
```

**Overlay (health_insurance_overlay.py):**
```python
# Line 1068: Signature embedding
if not preview and signature_b64:
    try:
        sig_img = _load_signature_image(signature_b64)
        if sig_img is not None:
            sig_rect = fitz.Rect(188.28, 615.6, 486.0, 652.92)
            page2.insert_image(sig_rect, stream=img_buffer.read())
```

**Issues Identified:**
1. ⚠️ **Signature Handling:** Uses `signatureData` key (different from Human Trafficking's `signature`)
2. ✅ **Preview Mode:** Already dynamic (checks if signature exists)
3. ❌ **No GET Endpoint:** Missing `/api/onboarding/{employee_id}/documents/health-insurance`

---

## Detailed Fix Plan

### Fix #1: Weapons Policy - Signature Key Mismatch

**File:** `backend/app/weapons_policy_certificate.py`
**Lines:** 73-92

**Current Code:**
```python
if not is_preview and signature_data.get('signatureImage'):
    try:
        sig_data = signature_data['signatureImage']
```

**Fix:**
```python
# ✅ FIX: Check for both 'signatureImage' and 'signature' keys (frontend sends 'signature')
sig_data_raw = signature_data.get('signatureImage') or signature_data.get('signature')

if not is_preview and sig_data_raw:
    try:
        sig_data = sig_data_raw
        
        print(f"✅ Weapons Policy - Processing signature: {len(base64.b64decode(sig_data.split(',')[1] if ',' in sig_data else sig_data))} bytes")
```

---

### Fix #2: Weapons Policy - Preview Mode Detection

**File:** `backend/app/main_enhanced.py`
**Lines:** 13824-13827

**Current Code:**
```python
signature_data = body.get('signature_data', {})
signed_date = (body.get('employee_data') or {}).get('signedDate') if isinstance(body.get('employee_data'), dict) else None

cert = generator.generate_certificate(employee_data, signature_data, signed_date=signed_date, is_preview=False)
```

**Fix:**
```python
signature_data = body.get('signature_data', {})
signed_date = (body.get('employee_data') or {}).get('signedDate') if isinstance(body.get('employee_data'), dict) else None

# ✅ FIX: Determine if this is a preview (no signature) or final signed document
has_signature = signature_data and (signature_data.get('signature') or signature_data.get('signatureImage'))
is_preview = not has_signature

logger.info(f"Weapons Policy PDF Generation:")
logger.info(f"  - Has signature: {has_signature}")
logger.info(f"  - Is preview: {is_preview}")
logger.info(f"  - Signed date: {signed_date}")

cert = generator.generate_certificate(employee_data, signature_data, signed_date=signed_date, is_preview=is_preview)
```

---

### Fix #3: Weapons Policy - PDF Rehydration Endpoint

**File:** `backend/app/main_enhanced.py`
**Location:** After line 14007 (after weapons-policy/preview endpoint)

**New Endpoint:**
```python
@app.get("/api/onboarding/{employee_id}/documents/weapons-policy")
async def get_weapons_policy_document(employee_id: str, token: Optional[str] = None):
    """Get existing signed Weapons Policy document if available"""
    try:
        logger.info(f"📥 Fetching Weapons Policy document for employee: {employee_id}")
        
        # Query signed_documents table for Weapons Policy document
        result = supabase_service.client.table("signed_documents")\
            .select("*")\
            .eq("employee_id", employee_id)\
            .eq("document_type", "weapons-policy")\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()

        if result.data and len(result.data) > 0:
            doc = result.data[0]
            metadata = doc.get('metadata', {})
            
            logger.info(f"✅ Found Weapons Policy document:")
            logger.info(f"   - Document ID: {doc.get('id')}")
            logger.info(f"   - Bucket: {metadata.get('bucket')}")
            logger.info(f"   - Path: {metadata.get('path')}")

            # Generate fresh signed URL if document exists in storage
            signed_url = None
            if metadata.get('bucket') and metadata.get('path'):
                try:
                    url_response = supabase_service.admin_client.storage.from_(metadata['bucket']).create_signed_url(
                        metadata['path'],
                        expires_in=3600  # 1 hour validity
                    )
                    if url_response and url_response.get('signedURL'):
                        signed_url = url_response['signedURL']
                        logger.info(f"✅ Generated fresh signed URL (expires in 1 hour)")
                except Exception as e:
                    logger.warning(f"Failed to generate signed URL for Weapons Policy: {e}")

            return success_response(
                data={
                    "has_document": True,
                    "document_metadata": {
                        "signed_url": signed_url or doc.get('pdf_url'),
                        "filename": doc.get('document_name'),
                        "signed_at": doc.get('signed_at'),
                        "bucket": metadata.get('bucket'),
                        "path": metadata.get('path')
                    }
                },
                message="Weapons Policy document found"
            )
        else:
            logger.info(f"❌ No Weapons Policy document found for employee: {employee_id}")
            return success_response(
                data={"has_document": False},
                message="No Weapons Policy document found"
            )

    except Exception as e:
        logger.error(f"Error retrieving Weapons Policy document: {e}")
        return error_response(
            message="Failed to retrieve Weapons Policy document",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR,
            status_code=500
        )
```

---

### Fix #4: Health Insurance - Signature Key Standardization

**Analysis:** Health Insurance uses `signatureData` key, which is different from Human Trafficking's `signature` key.

**Decision:** Keep Health Insurance as-is since it already works, but add fallback support for `signature` key for consistency.

**File:** `backend/app/generators/health_insurance_pdf_generator.py`
**Lines:** Around 210-220

**Current Code:**
```python
# Generate the PDF
pdf_bytes = self.pdf_filler.fill_health_insurance_form(employee_data)

# Note: Signature embedding is handled by the PDF forms layer
if signature_data:
    logger.info(f"🖊️ Signature data provided - will be embedded by PDF forms layer")
```

**Fix (Optional Enhancement):**
```python
# ✅ FIX: Support both 'signatureData' and 'signature' keys for consistency
if not signature_data and employee_data.get('signature'):
    signature_data = employee_data.get('signature')
    logger.info(f"✅ Using 'signature' key as fallback")

# Generate the PDF
pdf_bytes = self.pdf_filler.fill_health_insurance_form(employee_data)

# Note: Signature embedding is handled by the PDF forms layer
if signature_data:
    logger.info(f"🖊️ Signature data provided - will be embedded by PDF forms layer")
```

---

### Fix #5: Health Insurance - PDF Rehydration Endpoint

**File:** `backend/app/main_enhanced.py`
**Location:** After health-insurance/generate-pdf endpoint (around line 13750)

**New Endpoint:**
```python
@app.get("/api/onboarding/{employee_id}/documents/health-insurance")
async def get_health_insurance_document(employee_id: str, token: Optional[str] = None):
    """Get existing signed Health Insurance document if available"""
    try:
        logger.info(f"📥 Fetching Health Insurance document for employee: {employee_id}")
        
        # Query signed_documents table for Health Insurance document
        result = supabase_service.client.table("signed_documents")\
            .select("*")\
            .eq("employee_id", employee_id)\
            .eq("document_type", "health-insurance")\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()

        if result.data and len(result.data) > 0:
            doc = result.data[0]
            metadata = doc.get('metadata', {})
            
            logger.info(f"✅ Found Health Insurance document:")
            logger.info(f"   - Document ID: {doc.get('id')}")
            logger.info(f"   - Bucket: {metadata.get('bucket')}")
            logger.info(f"   - Path: {metadata.get('path')}")

            # Generate fresh signed URL
            signed_url = None
            if metadata.get('bucket') and metadata.get('path'):
                try:
                    url_response = supabase_service.admin_client.storage.from_(metadata['bucket']).create_signed_url(
                        metadata['path'],
                        expires_in=3600
                    )
                    if url_response and url_response.get('signedURL'):
                        signed_url = url_response['signedURL']
                        logger.info(f"✅ Generated fresh signed URL")
                except Exception as e:
                    logger.warning(f"Failed to generate signed URL: {e}")

            return success_response(
                data={
                    "has_document": True,
                    "document_metadata": {
                        "signed_url": signed_url or doc.get('pdf_url'),
                        "filename": doc.get('document_name'),
                        "signed_at": doc.get('signed_at'),
                        "bucket": metadata.get('bucket'),
                        "path": metadata.get('path')
                    }
                },
                message="Health Insurance document found"
            )
        else:
            logger.info(f"❌ No Health Insurance document found")
            return success_response(
                data={"has_document": False},
                message="No Health Insurance document found"
            )

    except Exception as e:
        logger.error(f"Error retrieving Health Insurance document: {e}")
        return error_response(
            message="Failed to retrieve Health Insurance document",
            error_code=ErrorCode.INTERNAL_SERVER_ERROR,
            status_code=500
        )
```

---

## Summary of Changes

### Files to Modify:

1. **`backend/app/weapons_policy_certificate.py`** (lines 73-92)
   - Fix signature key mismatch (check for both `signature` and `signatureImage`)

2. **`backend/app/main_enhanced.py`** (3 changes)
   - Lines 13824-13827: Fix Weapons Policy preview mode detection
   - After line 14007: Add Weapons Policy GET endpoint
   - After line 13750: Add Health Insurance GET endpoint

3. **`backend/app/generators/health_insurance_pdf_generator.py`** (optional, lines 210-220)
   - Add fallback support for `signature` key

---

## Testing Checklist

### Weapons Policy:
- [ ] Preview without signature
- [ ] Sign with signature
- [ ] Refresh page and verify PDF rehydration
- [ ] Check backend logs for signature processing

### Health Insurance:
- [ ] Preview without signature
- [ ] Sign with signature
- [ ] Refresh page and verify PDF rehydration
- [ ] Check backend logs for signature processing

---

## Approval Required

**Please review this plan and approve before I proceed with implementation.**

**Questions:**
1. Should I proceed with all fixes?
2. Should I include the optional Health Insurance signature key fallback?
3. Any specific concerns or modifications needed?

