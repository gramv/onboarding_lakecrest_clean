# Security Implementation Plan - Complete Roadmap

**Date:** October 3, 2025  
**Timeline:** 3-4 days (all features)  
**Risk Level:** 🟢 LOW (since existing data is test data)

---

## 📋 **IMPLEMENTATION ORDER**

### **Day 1: Audit Trail + Signed URL Expiration**
- Morning: Audit Trail (4 hours)
- Afternoon: Signed URL Expiration (4 hours)

### **Day 2: Field-Level Encryption**
- Full day: Implement encryption for SSN, bank accounts (8 hours)

### **Day 3: RBAC Policies + Testing**
- Morning: RBAC Policies (4 hours)
- Afternoon: Integration testing (4 hours)

### **Day 4: Final Testing + Documentation**
- Morning: End-to-end testing (4 hours)
- Afternoon: Documentation + deployment (4 hours)

---

## 🎯 **FEATURE 1: AUDIT TRAIL**

### **Timeline:** 4 hours
### **Risk:** 🟢 ZERO RISK

### **Step 1: Create Database Table (30 minutes)**

**File:** `backend/migrations/create_audit_trail.sql`

```sql
-- Document Access Audit Trail
CREATE TABLE IF NOT EXISTS document_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID,
  document_path TEXT NOT NULL,
  document_type VARCHAR(100),
  accessed_by UUID,
  access_type VARCHAR(50) NOT NULL, -- 'upload', 'view', 'download', 'delete', 'generate_url'
  ip_address VARCHAR(45),
  user_agent TEXT,
  user_role VARCHAR(50),
  property_id UUID,
  employee_id UUID,
  expires_at TIMESTAMP, -- For signed URLs
  accessed_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB -- Additional context
);

-- Indexes for fast queries
CREATE INDEX idx_document_access_log_document ON document_access_log(document_id);
CREATE INDEX idx_document_access_log_user ON document_access_log(accessed_by);
CREATE INDEX idx_document_access_log_time ON document_access_log(accessed_at);
CREATE INDEX idx_document_access_log_employee ON document_access_log(employee_id);
CREATE INDEX idx_document_access_log_property ON document_access_log(property_id);
CREATE INDEX idx_document_access_log_type ON document_access_log(access_type);

-- Enable Row Level Security
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access
CREATE POLICY "Service role full access to audit log"
ON document_access_log FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: HR can view all audit logs
CREATE POLICY "HR can view all audit logs"
ON document_access_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'hr'
  )
);

-- Policy: Managers can view audit logs for their property
CREATE POLICY "Managers can view property audit logs"
ON document_access_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM managers
    WHERE managers.user_id = auth.uid()
    AND managers.property_id = document_access_log.property_id
  )
);
```

**Deploy:**
```bash
cd backend
# Run migration in Supabase SQL Editor or via script
```

---

### **Step 2: Create Audit Service (1 hour)**

**File:** `backend/app/audit_service.py`

```python
"""
Audit Trail Service for Document Access Logging
"""

from typing import Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import Request
import logging

logger = logging.getLogger(__name__)


class AuditService:
    """Service for logging document access and operations"""
    
    def __init__(self, supabase_service):
        self.supabase = supabase_service
    
    async def log_document_access(
        self,
        document_id: Optional[str],
        document_path: str,
        document_type: str,
        access_type: str,
        accessed_by: Optional[str],
        request: Optional[Request] = None,
        property_id: Optional[str] = None,
        employee_id: Optional[str] = None,
        expires_at: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Log document access event.
        
        Args:
            document_id: UUID of document (if exists)
            document_path: Storage path of document
            document_type: Type of document (i9, w4, direct-deposit, etc.)
            access_type: Type of access (upload, view, download, delete, generate_url)
            accessed_by: User ID who accessed
            request: FastAPI request object (for IP, user agent)
            property_id: Property ID
            employee_id: Employee ID
            expires_at: Expiration time for signed URLs
            metadata: Additional context
        
        Returns:
            True if logged successfully, False otherwise
        """
        try:
            # Extract request info
            ip_address = None
            user_agent = None
            if request:
                ip_address = request.client.host if request.client else None
                user_agent = request.headers.get('user-agent')
            
            # Build log entry
            log_entry = {
                'document_id': document_id,
                'document_path': document_path,
                'document_type': document_type,
                'access_type': access_type,
                'accessed_by': accessed_by,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'property_id': property_id,
                'employee_id': employee_id,
                'expires_at': expires_at.isoformat() if expires_at else None,
                'accessed_at': datetime.now(timezone.utc).isoformat(),
                'metadata': metadata or {}
            }
            
            # Insert into audit log (non-blocking)
            await self.supabase.admin_client.table('document_access_log').insert(log_entry).execute()
            
            logger.info(f"Audit log: {access_type} - {document_type} - {document_path}")
            return True
            
        except Exception as e:
            # Log error but don't fail the main operation
            logger.warning(f"Failed to log document access: {e}")
            return False
    
    async def get_document_access_history(
        self,
        document_id: Optional[str] = None,
        employee_id: Optional[str] = None,
        property_id: Optional[str] = None,
        limit: int = 100
    ) -> list:
        """Get access history for a document, employee, or property"""
        try:
            query = self.supabase.admin_client.table('document_access_log').select('*')
            
            if document_id:
                query = query.eq('document_id', document_id)
            if employee_id:
                query = query.eq('employee_id', employee_id)
            if property_id:
                query = query.eq('property_id', property_id)
            
            result = await query.order('accessed_at', desc=True).limit(limit).execute()
            return result.data
            
        except Exception as e:
            logger.error(f"Failed to get access history: {e}")
            return []
    
    async def get_user_activity(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> list:
        """Get all document access activity for a user"""
        try:
            query = self.supabase.admin_client.table('document_access_log')\
                .select('*')\
                .eq('accessed_by', user_id)
            
            if start_date:
                query = query.gte('accessed_at', start_date.isoformat())
            if end_date:
                query = query.lte('accessed_at', end_date.isoformat())
            
            result = await query.order('accessed_at', desc=True).limit(limit).execute()
            return result.data
            
        except Exception as e:
            logger.error(f"Failed to get user activity: {e}")
            return []


# Global instance
audit_service = None

def get_audit_service(supabase_service):
    """Get or create audit service instance"""
    global audit_service
    if audit_service is None:
        audit_service = AuditService(supabase_service)
    return audit_service
```

---

### **Step 3: Add Logging to Document Operations (1.5 hours)**

**File:** `backend/app/supabase_service_enhanced.py`

Add logging to existing functions:

```python
from .audit_service import get_audit_service

class SupabaseService:
    def __init__(self):
        # ... existing code ...
        self.audit = get_audit_service(self)
    
    async def upload_signed_pdf_with_versioning(
        self,
        employee_id: str,
        property_id: str,
        form_type: str,
        pdf_bytes: bytes,
        signed_url_expires_in_seconds: int = 3600,
        request: Optional[Request] = None
    ):
        # ... existing upload code ...
        
        # ✅ ADD AUDIT LOG
        await self.audit.log_document_access(
            document_id=None,  # Will be set after DB insert
            document_path=active_path,
            document_type=form_type,
            access_type='upload',
            accessed_by=employee_id,
            request=request,
            property_id=property_id,
            employee_id=employee_id,
            metadata={'signed': True, 'version': 'active'}
        )
        
        # ... rest of existing code ...
```

**File:** `backend/app/manager_review_api.py`

Add logging when manager views documents:

```python
from app.audit_service import get_audit_service

@manager_router.get("/employees/{employee_id}/documents")
async def get_employee_documents(
    employee_id: str,
    current_user: User = Depends(get_current_manager),
    request: Request = None
):
    # ... existing code to get documents ...
    
    audit = get_audit_service(supabase_service)
    
    for doc in formatted_documents:
        # ✅ ADD AUDIT LOG for each document viewed
        await audit.log_document_access(
            document_id=doc.get('id'),
            document_path=doc.get('file_path'),
            document_type=doc.get('type'),
            access_type='view',
            accessed_by=current_user.id,
            request=request,
            property_id=current_user.property_id,
            employee_id=employee_id,
            expires_at=datetime.now() + timedelta(seconds=1800),  # 30 min
            metadata={'manager_review': True}
        )
    
    return formatted_documents
```

---

### **Step 4: Create Audit API Endpoints (1 hour)**

**File:** `backend/app/audit_api.py`

```python
"""
Audit Trail API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime
from app.auth import get_current_user, User
from app.audit_service import get_audit_service
from app.supabase_service_enhanced import get_supabase_service

audit_router = APIRouter(prefix="/api/audit", tags=["audit"])


@audit_router.get("/documents/{document_id}/history")
async def get_document_history(
    document_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get access history for a specific document (HR/Manager only)"""
    if current_user.role not in ['hr', 'manager']:
        raise HTTPException(403, "Access denied")
    
    audit = get_audit_service(get_supabase_service())
    history = await audit.get_document_access_history(document_id=document_id)
    
    return {
        "success": True,
        "data": {
            "document_id": document_id,
            "access_history": history,
            "total_accesses": len(history)
        }
    }


@audit_router.get("/employees/{employee_id}/activity")
async def get_employee_document_activity(
    employee_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all document activity for an employee (HR/Manager only)"""
    if current_user.role not in ['hr', 'manager']:
        raise HTTPException(403, "Access denied")
    
    audit = get_audit_service(get_supabase_service())
    activity = await audit.get_document_access_history(employee_id=employee_id)
    
    return {
        "success": True,
        "data": {
            "employee_id": employee_id,
            "activity": activity,
            "total_events": len(activity)
        }
    }


@audit_router.get("/users/{user_id}/activity")
async def get_user_activity(
    user_id: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Get document access activity for a user (HR only)"""
    if current_user.role != 'hr':
        raise HTTPException(403, "HR access required")
    
    audit = get_audit_service(get_supabase_service())
    
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None
    
    activity = await audit.get_user_activity(user_id, start, end)
    
    return {
        "success": True,
        "data": {
            "user_id": user_id,
            "activity": activity,
            "total_events": len(activity),
            "date_range": {
                "start": start_date,
                "end": end_date
            }
        }
    }


@audit_router.get("/properties/{property_id}/activity")
async def get_property_activity(
    property_id: str,
    limit: int = Query(100, le=1000),
    current_user: User = Depends(get_current_user)
):
    """Get all document activity for a property (Manager/HR only)"""
    if current_user.role not in ['hr', 'manager']:
        raise HTTPException(403, "Access denied")
    
    # Verify manager has access to this property
    if current_user.role == 'manager' and current_user.property_id != property_id:
        raise HTTPException(403, "Access denied to this property")
    
    audit = get_audit_service(get_supabase_service())
    activity = await audit.get_document_access_history(property_id=property_id, limit=limit)
    
    return {
        "success": True,
        "data": {
            "property_id": property_id,
            "activity": activity,
            "total_events": len(activity)
        }
    }
```

**Register router in main app:**

**File:** `backend/app/main_enhanced.py`

```python
from app.audit_api import audit_router

app.include_router(audit_router)
```

---

### **Testing Checklist:**

- [ ] Create audit table in Supabase
- [ ] Upload a document → Check audit log
- [ ] Manager views document → Check audit log
- [ ] Query audit history via API
- [ ] Verify RLS policies work
- [ ] Test with HR user
- [ ] Test with Manager user

---

## ⏱️ **FEATURE 2: SIGNED URL EXPIRATION**

### **Timeline:** 4 hours
### **Risk:** 🟢 VERY LOW RISK

### **Step 1: Define Expiration Constants (15 minutes)**

**File:** `backend/app/config/document_expiration.py`

```python
"""
Document Signed URL Expiration Configuration
"""

# Expiration times in seconds
EXPIRATION_TIMES = {
    # Federal forms with PII (short expiration)
    'i9': 900,                    # 15 minutes
    'i9_section1': 900,           # 15 minutes
    'i9_section2': 900,           # 15 minutes
    'w4': 900,                    # 15 minutes
    'w4_form': 900,               # 15 minutes
    'direct-deposit': 900,        # 15 minutes
    'direct_deposit': 900,        # 15 minutes
    
    # Health insurance (medium expiration)
    'health-insurance': 1800,     # 30 minutes
    'health_insurance': 1800,     # 30 minutes
    
    # Company policies (longer expiration)
    'company-policies': 3600,     # 1 hour
    'company_policies': 3600,     # 1 hour
    'trafficking-awareness': 3600, # 1 hour
    'trafficking_awareness': 3600, # 1 hour
    'weapons-policy': 3600,       # 1 hour
    'weapons_policy': 3600,       # 1 hour
    
    # Employee photos (long expiration)
    'photo': 86400,               # 24 hours
    'employee_photo': 86400,      # 24 hours
    
    # Default
    'default': 1800               # 30 minutes
}

# Manager/HR review expiration (longer for review workflow)
MANAGER_REVIEW_EXPIRATION = 1800  # 30 minutes
HR_REVIEW_EXPIRATION = 3600       # 1 hour

# Employee preview after signing (short)
EMPLOYEE_PREVIEW_EXPIRATION = 900  # 15 minutes


def get_expiration_time(document_type: str, user_role: str = 'employee') -> int:
    """
    Get appropriate expiration time for document type and user role.
    
    Args:
        document_type: Type of document (i9, w4, direct-deposit, etc.)
        user_role: Role of user accessing (employee, manager, hr)
    
    Returns:
        Expiration time in seconds
    """
    # Normalize document type
    doc_type = document_type.lower().replace('_', '-')
    
    # Get base expiration for document type
    base_expiration = EXPIRATION_TIMES.get(doc_type, EXPIRATION_TIMES['default'])
    
    # Adjust based on user role
    if user_role == 'hr':
        return max(base_expiration, HR_REVIEW_EXPIRATION)
    elif user_role == 'manager':
        return max(base_expiration, MANAGER_REVIEW_EXPIRATION)
    else:  # employee
        return base_expiration
```

---

### **Step 2: Update Document Upload (1 hour)**

**File:** `backend/app/supabase_service_enhanced.py`

```python
from app.config.document_expiration import get_expiration_time

async def upload_signed_pdf_with_versioning(
    self,
    employee_id: str,
    property_id: str,
    form_type: str,
    pdf_bytes: bytes,
    signed_url_expires_in_seconds: Optional[int] = None,  # Make optional
    request: Optional[Request] = None
):
    # ... existing code ...
    
    # ✅ SET EXPIRATION BASED ON DOCUMENT TYPE
    if signed_url_expires_in_seconds is None:
        signed_url_expires_in_seconds = get_expiration_time(form_type, 'employee')
    
    # Upload new active PDF
    self.admin_client.storage.from_(bucket_name).upload(
        active_path,
        pdf_bytes,
        file_options={"content-type": "application/pdf", "upsert": "true"}
    )
    
    # Create signed URL with explicit expiration
    signed = self.admin_client.storage.from_(bucket_name).create_signed_url(
        active_path,
        signed_url_expires_in_seconds  # ✅ Now explicitly set
    )
    
    # ✅ LOG WITH EXPIRATION TIME
    if self.audit:
        await self.audit.log_document_access(
            document_path=active_path,
            document_type=form_type,
            access_type='generate_url',
            accessed_by=employee_id,
            request=request,
            property_id=property_id,
            employee_id=employee_id,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=signed_url_expires_in_seconds),
            metadata={'expiration_seconds': signed_url_expires_in_seconds}
        )
    
    # ... rest of code ...
```

---

### **Step 3: Update Manager Document Access (1 hour)**

**File:** `backend/app/manager_review_api.py`

```python
from app.config.document_expiration import get_expiration_time, MANAGER_REVIEW_EXPIRATION

@manager_router.get("/employees/{employee_id}/documents")
async def get_employee_documents(
    employee_id: str,
    current_user: User = Depends(get_current_manager),
    request: Request = None
):
    # ... existing code to get documents ...
    
    formatted_documents = []
    
    for doc in documents:
        # ✅ GET EXPIRATION TIME BASED ON DOCUMENT TYPE AND USER ROLE
        expiration = get_expiration_time(doc['type'], current_user.role)
        
        # Generate signed URL with expiration
        signed_url = supabase.storage.from_('onboarding-documents').create_signed_url(
            doc['file_path'],
            expires_in=expiration  # ✅ Explicitly set
        )
        
        # ✅ LOG ACCESS WITH EXPIRATION
        await audit.log_document_access(
            document_id=doc.get('id'),
            document_path=doc['file_path'],
            document_type=doc['type'],
            access_type='generate_url',
            accessed_by=current_user.id,
            request=request,
            property_id=current_user.property_id,
            employee_id=employee_id,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=expiration),
            metadata={
                'manager_review': True,
                'expiration_seconds': expiration
            }
        )
        
        formatted_documents.append({
            'id': doc.get('id'),
            'type': doc['type'],
            'name': document_type_mapping.get(doc['type'], doc['type']),
            'url': signed_url,
            'created_at': doc.get('created_at'),
            'expires_in': expiration,  # ✅ Include expiration info
            'expires_at': (datetime.now(timezone.utc) + timedelta(seconds=expiration)).isoformat()
        })
    
    return {
        "success": True,
        "data": {
            "employee": employee_info,
            "documents": formatted_documents
        }
    }
```

---

### **Step 4: (Optional) Frontend Expiration Warning (1 hour)**

**File:** `frontend/hotel-onboarding-frontend/src/components/DocumentExpirationWarning.tsx`

```typescript
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

interface DocumentExpirationWarningProps {
  expiresAt?: string
  expiresIn?: number
}

export function DocumentExpirationWarning({ expiresAt, expiresIn }: DocumentExpirationWarningProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  
  useEffect(() => {
    if (expiresAt) {
      const updateTimeLeft = () => {
        const now = new Date().getTime()
        const expiry = new Date(expiresAt).getTime()
        const diff = Math.max(0, Math.floor((expiry - now) / 1000))
        setTimeLeft(diff)
      }
      
      updateTimeLeft()
      const interval = setInterval(updateTimeLeft, 1000)
      return () => clearInterval(interval)
    } else if (expiresIn) {
      setTimeLeft(expiresIn)
    }
  }, [expiresAt, expiresIn])
  
  if (!timeLeft || timeLeft > 3600) return null // Don't show if > 1 hour
  
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  
  return (
    <Alert className="mb-4">
      <Clock className="h-4 w-4" />
      <AlertDescription>
        This document link will expire in {minutes}:{seconds.toString().padStart(2, '0')}
        {timeLeft < 300 && ' - Please refresh the page if you need more time'}
      </AlertDescription>
    </Alert>
  )
}
```

**Usage in manager review:**

```typescript
// In manager document review component
{documents.map(doc => (
  <div key={doc.id}>
    <DocumentExpirationWarning expiresAt={doc.expires_at} />
    <PDFViewer pdfUrl={doc.url} />
  </div>
))}
```

---

### **Testing Checklist:**

- [ ] Upload document → Verify expiration is set
- [ ] Manager views document → Verify 30-minute expiration
- [ ] HR views document → Verify 1-hour expiration
- [ ] Wait for expiration → Verify URL stops working
- [ ] Refresh page → Verify new URL is generated
- [ ] Check audit log → Verify expiration times logged

---

---

## 🔐 **FEATURE 3: FIELD-LEVEL ENCRYPTION**

### **Timeline:** 8 hours (1 full day)
### **Risk:** 🟢 LOW RISK (since existing data is test data)

### **Step 1: Generate Encryption Key (15 minutes)**

```bash
# Generate a secure encryption key
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Output example: gAAAAABhX1234567890abcdefghijklmnopqrstuvwxyz==

# Add to Heroku
heroku config:set FIELD_ENCRYPTION_KEY="gAAAAABhX1234567890abcdefghijklmnopqrstuvwxyz==" -a ordermanagement

# Add to local .env
echo 'FIELD_ENCRYPTION_KEY="gAAAAABhX1234567890abcdefghijklmnopqrstuvwxyz=="' >> backend/.env
```

---

### **Step 2: Create Encryption Service (1 hour)**

**File:** `backend/app/encryption_service.py`

```python
"""
Field-Level Encryption Service for Sensitive PII
"""

import os
from cryptography.fernet import Fernet
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class EncryptionService:
    """Service for encrypting/decrypting sensitive fields"""

    def __init__(self):
        # Get encryption key from environment
        key = os.getenv('FIELD_ENCRYPTION_KEY')

        if not key:
            logger.warning("FIELD_ENCRYPTION_KEY not set - encryption disabled!")
            self.cipher = None
        else:
            try:
                self.cipher = Fernet(key.encode())
                logger.info("Field encryption enabled")
            except Exception as e:
                logger.error(f"Failed to initialize encryption: {e}")
                self.cipher = None

    def encrypt(self, value: Optional[str]) -> Optional[str]:
        """
        Encrypt a string value.

        Args:
            value: Plain text string to encrypt

        Returns:
            Encrypted string (base64 encoded) or None
        """
        if not value:
            return None

        if not self.cipher:
            logger.warning("Encryption not available - storing plain text!")
            return value

        try:
            encrypted = self.cipher.encrypt(value.encode())
            return encrypted.decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            return value  # Fallback to plain text

    def decrypt(self, encrypted_value: Optional[str]) -> Optional[str]:
        """
        Decrypt an encrypted string.

        Args:
            encrypted_value: Encrypted string (base64 encoded)

        Returns:
            Decrypted plain text string or None
        """
        if not encrypted_value:
            return None

        if not self.cipher:
            logger.warning("Encryption not available - returning as-is")
            return encrypted_value

        try:
            decrypted = self.cipher.decrypt(encrypted_value.encode())
            return decrypted.decode()
        except Exception as e:
            # If decryption fails, might be plain text (backwards compatibility)
            logger.warning(f"Decryption failed, returning as-is: {e}")
            return encrypted_value

    def is_encrypted(self, value: Optional[str]) -> bool:
        """Check if a value appears to be encrypted"""
        if not value:
            return False

        # Fernet encrypted strings start with 'gAAAAA'
        return value.startswith('gAAAAA')


# Global instance
_encryption_service = None

def get_encryption_service() -> EncryptionService:
    """Get or create encryption service instance"""
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service
```

---

### **Step 3: Update Database Schema (30 minutes)**

**File:** `backend/migrations/add_encrypted_fields.sql`

```sql
-- Add encrypted columns for sensitive PII
-- Keep old columns for now (backwards compatibility during migration)

-- Employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS ssn_encrypted TEXT,
ADD COLUMN IF NOT EXISTS bank_account_encrypted TEXT,
ADD COLUMN IF NOT EXISTS bank_routing_encrypted TEXT;

-- I-9 documents table (if exists)
ALTER TABLE i9_documents
ADD COLUMN IF NOT EXISTS document_number_encrypted TEXT,
ADD COLUMN IF NOT EXISTS alien_number_encrypted TEXT;

-- Create index for encrypted fields (for existence checks, not searching)
CREATE INDEX IF NOT EXISTS idx_employees_ssn_encrypted ON employees(ssn_encrypted) WHERE ssn_encrypted IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_bank_account_encrypted ON employees(bank_account_encrypted) WHERE bank_account_encrypted IS NOT NULL;

-- Add comment explaining encryption
COMMENT ON COLUMN employees.ssn_encrypted IS 'Encrypted SSN using Fernet (AES-128)';
COMMENT ON COLUMN employees.bank_account_encrypted IS 'Encrypted bank account number using Fernet (AES-128)';
COMMENT ON COLUMN employees.bank_routing_encrypted IS 'Encrypted bank routing number using Fernet (AES-128)';
```

---

### **Step 4: Update Data Models (1 hour)**

**File:** `backend/app/models/employee.py`

```python
from pydantic import BaseModel, Field, validator
from typing import Optional
from app.encryption_service import get_encryption_service

class EmployeeCreate(BaseModel):
    """Employee creation model with automatic encryption"""

    # Personal info
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]

    # Sensitive fields (will be encrypted)
    ssn: Optional[str] = None
    bank_account: Optional[str] = None
    bank_routing: Optional[str] = None

    # Other fields...

    def to_db_dict(self) -> dict:
        """Convert to database dict with encrypted fields"""
        encryption = get_encryption_service()

        data = self.dict()

        # Encrypt sensitive fields
        if data.get('ssn'):
            data['ssn_encrypted'] = encryption.encrypt(data['ssn'])
            data.pop('ssn')  # Remove plain text

        if data.get('bank_account'):
            data['bank_account_encrypted'] = encryption.encrypt(data['bank_account'])
            data.pop('bank_account')

        if data.get('bank_routing'):
            data['bank_routing_encrypted'] = encryption.encrypt(data['bank_routing'])
            data.pop('bank_routing')

        return data


class EmployeeResponse(BaseModel):
    """Employee response model with automatic decryption"""

    id: str
    first_name: str
    last_name: str
    email: str

    # Encrypted fields (will be decrypted on access)
    ssn: Optional[str] = None
    bank_account: Optional[str] = None
    bank_routing: Optional[str] = None

    # Other fields...

    @classmethod
    def from_db_dict(cls, data: dict) -> 'EmployeeResponse':
        """Create from database dict with decryption"""
        encryption = get_encryption_service()

        # Decrypt sensitive fields
        if data.get('ssn_encrypted'):
            data['ssn'] = encryption.decrypt(data['ssn_encrypted'])

        if data.get('bank_account_encrypted'):
            data['bank_account'] = encryption.decrypt(data['bank_account_encrypted'])

        if data.get('bank_routing_encrypted'):
            data['bank_routing'] = encryption.decrypt(data['bank_routing_encrypted'])

        return cls(**data)
```

---

### **Step 5: Update API Endpoints (2 hours)**

**File:** `backend/app/onboarding_api.py`

```python
from app.encryption_service import get_encryption_service

@router.post("/onboarding/{employee_id}/personal-info")
async def save_personal_info(
    employee_id: str,
    data: dict,
    current_user: User = Depends(get_current_user)
):
    encryption = get_encryption_service()

    # Encrypt SSN if present
    if data.get('ssn'):
        data['ssn_encrypted'] = encryption.encrypt(data['ssn'])
        data.pop('ssn')  # Remove plain text

    # Save to database
    result = await supabase.table('employees').update(data).eq('id', employee_id).execute()

    return {"success": True, "data": result.data}


@router.post("/onboarding/{employee_id}/direct-deposit")
async def save_direct_deposit(
    employee_id: str,
    data: dict,
    current_user: User = Depends(get_current_user)
):
    encryption = get_encryption_service()

    # Encrypt bank account info
    if data.get('bank_account'):
        data['bank_account_encrypted'] = encryption.encrypt(data['bank_account'])
        data.pop('bank_account')

    if data.get('bank_routing'):
        data['bank_routing_encrypted'] = encryption.encrypt(data['bank_routing'])
        data.pop('bank_routing')

    # Save to database
    result = await supabase.table('employees').update(data).eq('id', employee_id).execute()

    return {"success": True, "data": result.data}


@router.get("/onboarding/{employee_id}/data")
async def get_employee_data(
    employee_id: str,
    current_user: User = Depends(get_current_user)
):
    encryption = get_encryption_service()

    # Get from database
    result = await supabase.table('employees').select('*').eq('id', employee_id).single().execute()
    data = result.data

    # Decrypt sensitive fields
    if data.get('ssn_encrypted'):
        data['ssn'] = encryption.decrypt(data['ssn_encrypted'])
        data.pop('ssn_encrypted')  # Don't expose encrypted version

    if data.get('bank_account_encrypted'):
        data['bank_account'] = encryption.decrypt(data['bank_account_encrypted'])
        data.pop('bank_account_encrypted')

    if data.get('bank_routing_encrypted'):
        data['bank_routing'] = encryption.decrypt(data['bank_routing_encrypted'])
        data.pop('bank_routing_encrypted')

    return {"success": True, "data": data}
```

---

### **Step 6: Migrate Existing Test Data (1 hour)**

**File:** `backend/scripts/migrate_encryption.py`

```python
"""
Migrate existing plain text data to encrypted format
"""

import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client
from app.encryption_service import get_encryption_service

load_dotenv()

async def migrate_employee_data():
    """Encrypt existing employee SSN and bank account data"""

    supabase = create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_KEY')
    )

    encryption = get_encryption_service()

    # Get all employees with plain text SSN
    employees = supabase.table('employees').select('*').execute()

    migrated_count = 0

    for emp in employees.data:
        updates = {}

        # Encrypt SSN if present and not already encrypted
        if emp.get('ssn') and not emp.get('ssn_encrypted'):
            updates['ssn_encrypted'] = encryption.encrypt(emp['ssn'])
            updates['ssn'] = None  # Clear plain text

        # Encrypt bank account if present
        if emp.get('bank_account') and not emp.get('bank_account_encrypted'):
            updates['bank_account_encrypted'] = encryption.encrypt(emp['bank_account'])
            updates['bank_account'] = None

        # Encrypt routing number if present
        if emp.get('bank_routing') and not emp.get('bank_routing_encrypted'):
            updates['bank_routing_encrypted'] = encryption.encrypt(emp['bank_routing'])
            updates['bank_routing'] = None

        # Update if we have changes
        if updates:
            supabase.table('employees').update(updates).eq('id', emp['id']).execute()
            migrated_count += 1
            print(f"Migrated employee {emp['id']}")

    print(f"\nMigration complete! Migrated {migrated_count} employees")

if __name__ == '__main__':
    asyncio.run(migrate_employee_data())
```

**Run migration:**
```bash
cd backend
python scripts/migrate_encryption.py
```

---

### **Step 7: Update PDF Generators (1.5 hours)**

**File:** `backend/app/generators/i9_generator.py`

```python
from app.encryption_service import get_encryption_service

def generate_i9_pdf(employee_data: dict, signature_data: dict) -> bytes:
    encryption = get_encryption_service()

    # Decrypt SSN for PDF generation
    ssn = employee_data.get('ssn')
    if not ssn and employee_data.get('ssn_encrypted'):
        ssn = encryption.decrypt(employee_data['ssn_encrypted'])

    # Use decrypted SSN in PDF
    # ... rest of PDF generation ...
```

**File:** `backend/app/generators/w4_generator.py`

```python
from app.encryption_service import get_encryption_service

def generate_w4_pdf(employee_data: dict, form_data: dict, signature_data: dict) -> bytes:
    encryption = get_encryption_service()

    # Decrypt SSN for PDF
    ssn = employee_data.get('ssn')
    if not ssn and employee_data.get('ssn_encrypted'):
        ssn = encryption.decrypt(employee_data['ssn_encrypted'])

    # Use decrypted SSN in PDF
    # ... rest of PDF generation ...
```

**File:** `backend/app/generators/direct_deposit_generator.py`

```python
from app.encryption_service import get_encryption_service

def generate_direct_deposit_pdf(employee_data: dict, bank_data: dict, signature_data: dict) -> bytes:
    encryption = get_encryption_service()

    # Decrypt bank account info for PDF
    account = bank_data.get('bank_account')
    if not account and bank_data.get('bank_account_encrypted'):
        account = encryption.decrypt(bank_data['bank_account_encrypted'])

    routing = bank_data.get('bank_routing')
    if not routing and bank_data.get('bank_routing_encrypted'):
        routing = encryption.decrypt(bank_data['bank_routing_encrypted'])

    # Use decrypted values in PDF
    # ... rest of PDF generation ...
```

---

### **Testing Checklist:**

- [ ] Generate encryption key and add to Heroku/local
- [ ] Create encryption service
- [ ] Add encrypted columns to database
- [ ] Test encrypting SSN on save
- [ ] Test decrypting SSN on retrieve
- [ ] Test encrypting bank account on save
- [ ] Test decrypting bank account on retrieve
- [ ] Run migration script on test data
- [ ] Verify PDFs generate correctly with encrypted data
- [ ] Test I-9 PDF with encrypted SSN
- [ ] Test W-4 PDF with encrypted SSN
- [ ] Test Direct Deposit PDF with encrypted bank info

---

## 🔒 **FEATURE 4: ROLE-BASED ACCESS CONTROL (RBAC)**

### **Timeline:** 4 hours
### **Risk:** 🟢 LOW RISK

### **Step 1: Create Storage RLS Policies (1 hour)**

**File:** `backend/migrations/storage_rbac_policies.sql`

```sql
-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role full access" ON storage.objects;
DROP POLICY IF EXISTS "Managers can view property documents" ON storage.objects;
DROP POLICY IF EXISTS "HR can view all documents" ON storage.objects;
DROP POLICY IF EXISTS "Employees can view own documents" ON storage.objects;

-- Policy 1: Service role has full access (backend)
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 2: HR can view all employee documents
CREATE POLICY "HR can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id IN ('onboarding-documents', 'employee-documents', 'generated-pdfs')
    AND EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'hr'
    )
);

-- Policy 3: Managers can view documents for their property only
CREATE POLICY "Managers can view property documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id IN ('onboarding-documents', 'employee-documents', 'generated-pdfs')
    AND EXISTS (
        SELECT 1 FROM managers m
        JOIN employees e ON e.property_id = m.property_id
        WHERE m.user_id = auth.uid()
        AND (storage.foldername(name))[1] = e.property_id::text
    )
);

-- Policy 4: Employees can view their own documents (via signed URLs only)
-- Note: Employees don't have direct access, only via backend-generated signed URLs
-- This policy is for future direct access if needed
CREATE POLICY "Employees can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id IN ('onboarding-documents', 'employee-documents')
    AND EXISTS (
        SELECT 1 FROM employees
        WHERE employees.user_id = auth.uid()
        AND (storage.foldername(name))[2] = employees.id::text
    )
);

-- Verify policies
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects'
ORDER BY policyname;
```

---

### **Step 2: Create Database RLS Policies (1 hour)**

**File:** `backend/migrations/database_rbac_policies.sql`

```sql
-- Enable RLS on sensitive tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_form_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE i9_documents ENABLE ROW LEVEL SECURITY;

-- Employees table policies
DROP POLICY IF EXISTS "Service role full access to employees" ON employees;
DROP POLICY IF EXISTS "HR can view all employees" ON employees;
DROP POLICY IF EXISTS "Managers can view property employees" ON employees;
DROP POLICY IF EXISTS "Employees can view own data" ON employees;

CREATE POLICY "Service role full access to employees"
ON employees FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "HR can view all employees"
ON employees FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'hr'
    )
);

CREATE POLICY "Managers can view property employees"
ON employees FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM managers
        WHERE managers.user_id = auth.uid()
        AND managers.property_id = employees.property_id
    )
);

CREATE POLICY "Employees can view own data"
ON employees FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Onboarding form data policies
DROP POLICY IF EXISTS "Service role full access to form data" ON onboarding_form_data;
DROP POLICY IF EXISTS "HR can view all form data" ON onboarding_form_data;
DROP POLICY IF EXISTS "Managers can view property form data" ON onboarding_form_data;

CREATE POLICY "Service role full access to form data"
ON onboarding_form_data FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "HR can view all form data"
ON onboarding_form_data FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'hr'
    )
);

CREATE POLICY "Managers can view property form data"
ON onboarding_form_data FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM managers m
        JOIN employees e ON e.property_id = m.property_id
        WHERE m.user_id = auth.uid()
        AND e.id = onboarding_form_data.employee_id
    )
);
```

---

### **Step 3: Test RLS Policies (1 hour)**

**File:** `backend/tests/test_rbac.py`

```python
"""
Test Role-Based Access Control policies
"""

import pytest
from supabase import create_client
import os

@pytest.mark.asyncio
async def test_hr_can_view_all_employees():
    """HR should be able to view all employees"""
    # Create client with HR user token
    hr_client = create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_ANON_KEY')
    )
    # Set auth token for HR user
    hr_client.auth.set_session(hr_token)

    # Query all employees
    result = hr_client.table('employees').select('*').execute()

    assert len(result.data) > 0, "HR should see all employees"


@pytest.mark.asyncio
async def test_manager_can_only_view_property_employees():
    """Manager should only see employees from their property"""
    # Create client with manager user token
    manager_client = create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_ANON_KEY')
    )
    manager_client.auth.set_session(manager_token)

    # Query employees
    result = manager_client.table('employees').select('*').execute()

    # Verify all returned employees belong to manager's property
    for emp in result.data:
        assert emp['property_id'] == manager_property_id


@pytest.mark.asyncio
async def test_employee_can_only_view_own_data():
    """Employee should only see their own data"""
    # Create client with employee user token
    employee_client = create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_ANON_KEY')
    )
    employee_client.auth.set_session(employee_token)

    # Query employees
    result = employee_client.table('employees').select('*').execute()

    # Should only see own record
    assert len(result.data) == 1
    assert result.data[0]['user_id'] == employee_user_id
```

---

### **Step 4: Update API Authorization (1 hour)**

**File:** `backend/app/auth.py`

```python
from fastapi import HTTPException, Depends
from typing import Optional

async def require_hr(current_user: User = Depends(get_current_user)) -> User:
    """Require HR role"""
    if current_user.role != 'hr':
        raise HTTPException(403, "HR access required")
    return current_user


async def require_manager_or_hr(current_user: User = Depends(get_current_user)) -> User:
    """Require manager or HR role"""
    if current_user.role not in ['manager', 'hr']:
        raise HTTPException(403, "Manager or HR access required")
    return current_user


async def require_property_access(
    property_id: str,
    current_user: User = Depends(get_current_user)
) -> User:
    """Require access to specific property"""
    if current_user.role == 'hr':
        return current_user  # HR has access to all properties

    if current_user.role == 'manager':
        if current_user.property_id != property_id:
            raise HTTPException(403, "Access denied to this property")
        return current_user

    raise HTTPException(403, "Insufficient permissions")
```

**Update endpoints:**

```python
@router.get("/employees")
async def get_all_employees(
    current_user: User = Depends(require_hr)  # Only HR
):
    # HR can see all employees
    result = await supabase.table('employees').select('*').execute()
    return {"success": True, "data": result.data}


@router.get("/properties/{property_id}/employees")
async def get_property_employees(
    property_id: str,
    current_user: User = Depends(require_property_access)  # Manager or HR
):
    # Manager can only see their property, HR can see all
    result = await supabase.table('employees')\
        .select('*')\
        .eq('property_id', property_id)\
        .execute()
    return {"success": True, "data": result.data}
```

---

### **Testing Checklist:**

- [ ] Create RLS policies in Supabase
- [ ] Test HR can view all employees
- [ ] Test Manager can only view their property
- [ ] Test Employee can only view own data
- [ ] Test storage access (HR, Manager, Employee)
- [ ] Test API endpoints with different roles
- [ ] Verify unauthorized access is blocked

---

## 📊 **COMPLETE IMPLEMENTATION TIMELINE**

### **Day 1: Audit Trail + Signed URL Expiration**
- **Morning (4 hours):** Audit Trail
  - Create database table (30 min)
  - Create audit service (1 hour)
  - Add logging to operations (1.5 hours)
  - Create API endpoints (1 hour)

- **Afternoon (4 hours):** Signed URL Expiration
  - Define expiration constants (15 min)
  - Update document upload (1 hour)
  - Update manager access (1 hour)
  - Frontend warning component (1 hour)
  - Testing (45 min)

### **Day 2: Field-Level Encryption**
- **Full Day (8 hours):**
  - Generate encryption key (15 min)
  - Create encryption service (1 hour)
  - Update database schema (30 min)
  - Update data models (1 hour)
  - Update API endpoints (2 hours)
  - Migrate test data (1 hour)
  - Update PDF generators (1.5 hours)
  - Testing (45 min)

### **Day 3: RBAC + Integration Testing**
- **Morning (4 hours):** RBAC
  - Create storage RLS policies (1 hour)
  - Create database RLS policies (1 hour)
  - Update API authorization (1 hour)
  - Testing (1 hour)

- **Afternoon (4 hours):** Integration Testing
  - Test complete employee onboarding flow
  - Test manager document review
  - Test HR access
  - Test audit trail
  - Test encryption/decryption
  - Test signed URL expiration

### **Day 4: Final Testing + Deployment**
- **Morning (4 hours):** End-to-End Testing
  - Test all security features together
  - Performance testing
  - Security testing
  - Bug fixes

- **Afternoon (4 hours):** Documentation + Deployment
  - Update API documentation
  - Create security documentation
  - Deploy to production
  - Monitor logs

---

## ✅ **DEPLOYMENT CHECKLIST**

### **Pre-Deployment:**
- [ ] Generate and set FIELD_ENCRYPTION_KEY in Heroku
- [ ] Run database migrations (audit table, encrypted columns, RLS policies)
- [ ] Migrate existing test data to encrypted format
- [ ] Test all features in local environment
- [ ] Review code changes
- [ ] Update API documentation

### **Deployment:**
- [ ] Deploy backend to Heroku
- [ ] Deploy frontend to Vercel
- [ ] Verify environment variables set
- [ ] Run smoke tests

### **Post-Deployment:**
- [ ] Monitor error logs
- [ ] Test employee onboarding flow
- [ ] Test manager document review
- [ ] Test HR access
- [ ] Verify audit logs are being created
- [ ] Verify encryption is working
- [ ] Verify signed URLs expire correctly
- [ ] Verify RLS policies are enforced

---

## 🎯 **SUCCESS CRITERIA**

### **Audit Trail:**
- ✅ All document operations logged
- ✅ Can query access history by document, employee, user, property
- ✅ Audit log includes IP, user agent, timestamp, expiration
- ✅ HR/Manager can view audit logs via API

### **Signed URL Expiration:**
- ✅ All signed URLs have explicit expiration times
- ✅ Different expiration for different document types
- ✅ Manager URLs expire in 30 minutes
- ✅ HR URLs expire in 1 hour
- ✅ Sensitive docs (I-9, W-4) expire in 15 minutes
- ✅ Expiration times logged in audit trail

### **Field-Level Encryption:**
- ✅ SSN encrypted in database
- ✅ Bank account numbers encrypted
- ✅ Bank routing numbers encrypted
- ✅ Decryption works for PDF generation
- ✅ Decryption works for API responses
- ✅ No plain text PII in database

### **RBAC:**
- ✅ HR can access all employees/documents
- ✅ Managers can only access their property
- ✅ Employees can only access own data
- ✅ Storage RLS policies enforced
- ✅ Database RLS policies enforced
- ✅ API endpoints enforce authorization

---

## 🚀 **READY TO START?**

**Estimated Total Time:** 3-4 days
**Risk Level:** 🟢 LOW (all features are safe to implement)
**Impact:** 🔒 Major security improvement

**Next Steps:**
1. Review this plan
2. Confirm timeline works
3. Start with Day 1 (Audit Trail + Signed URL Expiration)
4. Progress through each day sequentially
5. Deploy to production on Day 4

**Let me know when you're ready to begin implementation!**

