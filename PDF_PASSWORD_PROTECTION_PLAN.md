# PDF Password Protection Implementation Plan

## Overview

Add password protection to all completed onboarding documents when they are downloaded or emailed. All PDFs will require password **"7935"** to open.

## Current State Analysis

### Document Flow

1. **Storage**: Documents are encrypted at rest using Fernet/AES-128 encryption
   - Service: `backend/app/services/document_encryption_service.py`
   - Encrypted before upload to Supabase Storage
   - Decrypted when retrieved for viewing/download

2. **Download Points** (where PDFs are sent to users):
   - **Manager Dashboard - Employee Details**: `DocumentsViewer` component
   - **Email Attachments**: New hire package, individual signed documents
   - **Direct Downloads**: PDF preview modals, document download buttons

3. **Current Security**:
   - ✅ Encryption at rest (Fernet/AES-128)
   - ✅ Decryption for authorized viewing
   - ❌ **No password protection on downloaded PDFs**

### Problem

When users download or receive PDFs via email:
- PDFs are decrypted from storage
- Sent as plain PDFs (no password required to open)
- Anyone with the file can open it without authentication

### Solution

Add PDF password protection layer:
- Storage: Encrypted (Fernet) ← **Existing**
- Retrieval: Decrypt from storage ← **Existing**
- **NEW**: Add password protection before sending to user
- Download/Email: Password-protected PDF (requires "7935" to open)

---

## Implementation Plan

### Phase 1: Create Password Protection Service

**File**: `backend/app/services/pdf_password_service.py`

```python
"""
PDF Password Protection Service
Adds password protection to PDF documents before download/email
"""
from PyPDF2 import PdfReader, PdfWriter
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

DEFAULT_PASSWORD = "7935"

def add_password_protection(
    pdf_bytes: bytes,
    password: str = DEFAULT_PASSWORD,
    allow_printing: bool = True,
    allow_commenting: bool = False
) -> bytes:
    """
    Add password protection to a PDF document.
    
    Args:
        pdf_bytes: Input PDF as bytes
        password: Password to protect the PDF (default: "7935")
        allow_printing: Allow printing the PDF (default: True)
        allow_commenting: Allow commenting/annotations (default: False)
    
    Returns:
        Password-protected PDF as bytes
    
    Raises:
        ValueError: If pdf_bytes is empty or invalid
        RuntimeError: If password protection fails
    
    Example:
        >>> pdf_bytes = open('document.pdf', 'rb').read()
        >>> protected_pdf = add_password_protection(pdf_bytes)
        >>> # protected_pdf requires password "7935" to open
    """
    if not pdf_bytes:
        raise ValueError("PDF bytes cannot be empty")
    
    try:
        # Read the input PDF
        pdf_reader = PdfReader(BytesIO(pdf_bytes))
        pdf_writer = PdfWriter()
        
        # Copy all pages to writer
        for page in pdf_reader.pages:
            pdf_writer.add_page(page)
        
        # Add password protection
        # user_password: Required to open the PDF
        # owner_password: Required to change permissions (we use same password)
        pdf_writer.encrypt(
            user_password=password,
            owner_password=password,
            permissions_flag=0b0000_0100 if allow_printing else 0b0000_0000
        )
        
        # Write to bytes
        output_buffer = BytesIO()
        pdf_writer.write(output_buffer)
        protected_bytes = output_buffer.getvalue()
        
        logger.info(
            f"✅ PDF password protected: {len(pdf_bytes)} → {len(protected_bytes)} bytes"
        )
        
        return protected_bytes
        
    except Exception as e:
        logger.error(f"❌ Failed to add password protection: {e}")
        raise RuntimeError(f"Password protection failed: {e}")


# Convenience function for common use case
def protect_pdf_for_download(pdf_bytes: bytes) -> bytes:
    """
    Protect PDF with standard password for download.
    Uses default password "7935" and allows printing.
    """
    return add_password_protection(pdf_bytes, password=DEFAULT_PASSWORD, allow_printing=True)
```

**Dependencies**: PyPDF2 is already installed in the environment.

---

### Phase 2: Update Document Download Endpoints

#### 2.1 Identify Download Points

**Frontend Components**:
1. `DocumentsViewer.tsx` - Downloads documents from employee details
2. `DocumentPreviewModal.tsx` - Download button in preview modal
3. `EmployeeDetailsView.tsx` - Uses DocumentsViewer

**Backend Endpoints** (need to find where PDFs are returned):
- Need to trace where `DocumentsViewer` fetches PDFs
- Likely in `manager_document_approval_router.py` or similar

#### 2.2 Update Backend Document Retrieval

**Pattern to Apply**:
```python
from app.services.pdf_password_service import protect_pdf_for_download

# BEFORE:
decrypted_bytes, was_encrypted = supabase_service.doc_encryption.decrypt_document(
    encrypted_bytes,
    document_type='i9_form',
    employee_id=employee_id
)
pdf_base64 = base64.b64encode(decrypted_bytes).decode('utf-8')

# AFTER:
decrypted_bytes, was_encrypted = supabase_service.doc_encryption.decrypt_document(
    encrypted_bytes,
    document_type='i9_form',
    employee_id=employee_id
)
# Add password protection before sending to client
protected_bytes = protect_pdf_for_download(decrypted_bytes)
pdf_base64 = base64.b64encode(protected_bytes).decode('utf-8')
```

**Files to Update**:
- `backend/app/routers/manager_document_approval_router.py`
  - I-9 detail endpoint (line ~2242)
  - W-4 detail endpoint (line ~2418)
  - Any other document detail endpoints
- Search for all places where PDFs are converted to base64 for frontend

---

### Phase 3: Update Email Attachments

#### 3.1 Manager Review Packet Email

**File**: `backend/app/routers/manager_document_approval_router.py`

**Location**: Lines 3104-3118 (complete review endpoint)

```python
# BEFORE (line 3104-3118):
packet_buffer = io.BytesIO()
packet_writer.write(packet_buffer)
packet_bytes = packet_buffer.getvalue()

packet_save = await supabase_service.save_signed_document(...)
packet_base64 = base64.b64encode(packet_bytes).decode('utf-8')

# AFTER:
from app.services.pdf_password_service import protect_pdf_for_download

packet_buffer = io.BytesIO()
packet_writer.write(packet_buffer)
packet_bytes = packet_buffer.getvalue()

# Save unprotected version to storage (already encrypted by save_signed_document)
packet_save = await supabase_service.save_signed_document(...)

# Protect PDF before emailing
protected_packet_bytes = protect_pdf_for_download(packet_bytes)
packet_base64 = base64.b64encode(protected_packet_bytes).decode('utf-8')
```

#### 3.2 Individual Document Emails

**File**: `backend/app/email_service.py`

**Functions to Update**:
1. `send_signed_document_email()` (line ~1120)
2. `send_document_to_hr_and_employee()` (line ~2027)
3. Any other functions that attach PDFs

**Pattern**:
```python
from app.services.pdf_password_service import protect_pdf_for_download

# Before creating attachment:
protected_pdf_bytes = protect_pdf_for_download(pdf_bytes)
pdf_base64 = base64.b64encode(protected_pdf_bytes).decode('utf-8')

attachments = [{
    "filename": filename,
    "content_base64": pdf_base64,  # Now password-protected
    "mime_type": "application/pdf"
}]
```

---

### Phase 4: Update Email Templates

#### 4.1 Manager Review Packet Email Template

**File**: `backend/app/email_service.py`

**Function**: `send_manager_review_packet_email()` (line ~2254)

**Add to email body**:
```html
<div style="background-color: #FFF3CD; border-left: 4px solid #FFC107; padding: 12px; margin: 20px 0;">
    <p style="margin: 0; color: #856404;">
        <strong>🔒 Password Protected</strong><br>
        The attached PDF is password protected. Use password: <strong>7935</strong>
    </p>
</div>
```

**Text version**:
```
---
🔒 IMPORTANT: The attached PDF is password protected.
Password: 7935
---
```

#### 4.2 New Hire Notification Email

**File**: `backend/app/email_service.py`

**Function**: `send_new_hire_notification_email()` (line ~2644)

Currently this email doesn't attach PDFs, but if it does in the future, add the same password notice.

---

### Phase 5: Testing Checklist

#### 5.1 Document Download Tests

- [ ] **I-9 Form**: Download from employee details → Requires password "7935"
- [ ] **W-4 Form**: Download from employee details → Requires password "7935"
- [ ] **Direct Deposit**: Download from employee details → Requires password "7935"
- [ ] **Health Insurance**: Download from employee details → Requires password "7935"
- [ ] **Complete Packet**: Download from employee details → Requires password "7935"

#### 5.2 Email Attachment Tests

- [ ] **Manager Packet Email**: Receive email → Download attachment → Requires password "7935"
- [ ] **Individual Document Email**: Receive signed document email → Requires password "7935"
- [ ] **Email Template**: Verify password instruction appears in email body

#### 5.3 Functionality Tests

- [ ] **Correct Password**: Enter "7935" → PDF opens successfully
- [ ] **Wrong Password**: Enter wrong password → PDF remains locked
- [ ] **Printing**: After opening with password → Can print the PDF
- [ ] **No Password**: Try to open without password → Fails

#### 5.4 Regression Tests

- [ ] **Storage**: PDFs still encrypted at rest (Fernet encryption)
- [ ] **Decryption**: PDFs still decrypt correctly from storage
- [ ] **Preview**: PDF preview in UI still works (may need password prompt)
- [ ] **Manager Review**: Complete review workflow still works end-to-end

---

## Security Considerations

### Why Password "7935"?

- Simple, memorable password for internal use
- Not meant for high-security scenarios
- Adds a layer of protection for emailed/downloaded PDFs
- Prevents casual viewing by unauthorized recipients

### Security Layers

1. **Storage Encryption** (Fernet/AES-128): Protects data at rest
2. **Access Control** (RLS + Auth): Prevents unauthorized access
3. **PDF Password** (7935): Protects downloaded/emailed files

### Limitations

- Password is shared across all documents
- Not suitable for highly sensitive scenarios
- Users can share password with others
- **Purpose**: Prevent casual/accidental access, not sophisticated attacks

---

## Implementation Order

1. ✅ **Create password protection service** (`pdf_password_service.py`)
2. ✅ **Test service** with sample PDF
3. ✅ **Update document download endpoints** (backend)
4. ✅ **Update email packet attachment** (manager review complete)
5. ✅ **Update individual document emails** (if any)
6. ✅ **Update email templates** (add password instructions)
7. ✅ **Test all download points**
8. ✅ **Test all email attachments**
9. ✅ **Deploy to production**

---

## Files to Modify

### New Files
- `backend/app/services/pdf_password_service.py` ← **Create**

### Modified Files
- `backend/app/routers/manager_document_approval_router.py`
  - Complete review endpoint (line ~3104-3118)
  - Document detail endpoints (I-9, W-4, etc.)
- `backend/app/email_service.py`
  - `send_manager_review_packet_email()` (line ~2254)
  - `send_signed_document_email()` (if exists)
  - `send_document_to_hr_and_employee()` (if exists)

### Testing Files
- Create test script to verify password protection works

---

## Rollback Plan

If issues arise:
1. Remove `protect_pdf_for_download()` calls
2. PDFs will be sent without password protection (as before)
3. Storage encryption remains intact
4. No data loss risk

---

## Notes

- **PyPDF2** is already installed in the environment
- Password protection is applied **after** decryption, **before** sending to client
- Storage remains encrypted with Fernet (no changes to storage layer)
- Frontend requires no changes (PDFs are still base64-encoded)
- Users will need to enter password when opening downloaded PDFs

