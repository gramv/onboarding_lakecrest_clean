# Security Audit Report - Document Storage

**Date:** October 3, 2025  
**System:** Hotel Employee Onboarding Platform  
**Audited By:** System Analysis

---

## 🔍 **CURRENT SECURITY STATUS**

### ✅ **WHAT'S SECURE**

#### **1. Storage Buckets - Private by Default**
All buckets are configured as **PRIVATE** (not publicly accessible):

```
✅ employee-documents      - Private
✅ onboarding-forms        - Private  
✅ employee-photos         - Private
✅ property-documents      - Private
✅ generated-documents     - Private
✅ onboarding-documents    - Private
✅ generated-pdfs          - Private
✅ i9-documents            - Private
```

**What this means:**
- Documents are NOT publicly accessible via direct URL
- Requires authentication to access
- Uses signed URLs with expiration for temporary access

---

#### **2. Row-Level Security (RLS) Policies**
Storage policies are defined in `backend/migrations/storage_rls_policies.sql`:

```sql
-- Service role has full access
CREATE POLICY "Service role full access to employee-documents"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'employee-documents')
WITH CHECK (bucket_id = 'employee-documents');
```

**What this means:**
- Only the backend (with service key) can upload/delete documents
- Frontend cannot directly access storage
- All access goes through backend API with authentication

---

#### **3. Access Control**
- ✅ Backend uses **SUPABASE_SERVICE_KEY** (configured on Heroku)
- ✅ Frontend uses **SUPABASE_ANON_KEY** (limited permissions)
- ✅ Documents accessed via **signed URLs** with expiration
- ✅ No direct public access to sensitive documents

---

### ⚠️ **WHAT'S MISSING / NEEDS IMPROVEMENT**

#### **1. Encryption at Rest - PARTIAL**

**Current Status:**
- ✅ Supabase provides **default encryption at rest** for all storage
- ✅ Uses AES-256 encryption (industry standard)
- ❌ **No additional field-level encryption** for sensitive data (SSN, bank accounts)

**What Supabase Provides:**
- All files stored in S3 with server-side encryption (SSE-S3)
- Encryption keys managed by AWS
- Data encrypted before writing to disk

**What's Missing:**
- No application-level encryption for extra-sensitive fields
- SSN, bank account numbers stored as plain text in database
- Document numbers (passport, DL) not encrypted

**Risk Level:** 🟡 MEDIUM
- Supabase encryption is good, but not defense-in-depth
- If database is compromised, sensitive data is readable

---

#### **2. Field-Level Encryption - NOT IMPLEMENTED**

**Current Code:**
The system has encryption code defined but **NOT ACTIVELY USED**:

<augment_code_snippet path="backend/app/document_storage.py" mode="EXCERPT">
````python
# Encryption is initialized but not used for Supabase storage
if encryption_key:
    self.cipher = Fernet(encryption_key)
else:
    self.cipher = Fernet(Fernet.generate_key())
````
</augment_code_snippet>

**What Should Be Encrypted:**
- ❌ Social Security Numbers (SSN)
- ❌ Bank account numbers
- ❌ Bank routing numbers
- ❌ Passport numbers
- ❌ Driver's license numbers
- ❌ Alien registration numbers

**Risk Level:** 🔴 HIGH
- Sensitive PII is stored in plain text
- Violates data protection best practices
- Potential compliance issues (GDPR, CCPA)

---

#### **3. Audit Trail - PARTIAL**

**Current Status:**
- ✅ Document uploads are logged
- ✅ Timestamps recorded
- ❌ **No comprehensive audit log** for document access
- ❌ No tracking of who viewed/downloaded documents
- ❌ No IP address logging for access

**What's Missing:**
```sql
-- This table doesn't exist yet
CREATE TABLE document_access_log (
  id UUID PRIMARY KEY,
  document_id UUID,
  accessed_by UUID,
  access_type VARCHAR(50), -- 'view', 'download', 'delete'
  ip_address VARCHAR(45),
  user_agent TEXT,
  accessed_at TIMESTAMP
);
```

**Risk Level:** 🟡 MEDIUM
- Can't track who accessed sensitive documents
- Difficult to investigate security incidents
- No compliance audit trail

---

#### **4. Signed URL Expiration - NEEDS VERIFICATION**

**Current Code:**
Documents are accessed via signed URLs, but expiration time is unclear:

```python
# Need to verify expiration time
signed_url = supabase.storage.from_(bucket).create_signed_url(path, expires_in=???)
```

**Best Practice:**
- Short expiration (15-60 minutes) for sensitive documents
- Longer expiration (24 hours) for less sensitive documents
- No permanent URLs for PII

**Risk Level:** 🟡 MEDIUM
- If URLs don't expire, documents could be accessed indefinitely
- Shared URLs could leak sensitive data

---

#### **5. Document Retention - NOT AUTOMATED**

**Current Status:**
- ✅ Retention periods defined in code (3 years / 1 year)
- ❌ **No automated deletion** after retention period expires
- ❌ No archival process for expired documents

**What's Missing:**
- Automated job to delete documents after retention period
- Archival to cold storage before deletion
- Compliance reporting for retention

**Risk Level:** 🟡 MEDIUM
- Documents kept longer than legally required
- Increased storage costs
- Potential compliance violations

---

#### **6. Access Control Granularity - BASIC**

**Current Status:**
- ✅ Service role has full access
- ❌ **No role-based access control** for managers/HR
- ❌ Managers can't be restricted to their property's documents
- ❌ No separation between HR and manager permissions

**What's Missing:**
```sql
-- Manager access policy (commented out in code)
CREATE POLICY "Managers can view property employee documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id IN ('employee-documents')
    AND EXISTS (
        SELECT 1 FROM managers
        WHERE managers.user_id = auth.uid()
        AND (storage.foldername(name))[1] = managers.property_id::text
    )
);
```

**Risk Level:** 🟡 MEDIUM
- All backend access has full permissions
- No principle of least privilege
- Managers could potentially access other properties' documents

---

## 🎯 **SECURITY RECOMMENDATIONS**

### **Priority 1: CRITICAL (Implement Immediately)**

#### **1. Field-Level Encryption for Sensitive Data**

**What to encrypt:**
- SSN (Social Security Number)
- Bank account numbers
- Bank routing numbers
- Passport numbers
- Driver's license numbers

**Implementation:**
```python
from cryptography.fernet import Fernet
import os

# Use environment variable for encryption key
ENCRYPTION_KEY = os.getenv('FIELD_ENCRYPTION_KEY')
cipher = Fernet(ENCRYPTION_KEY.encode())

def encrypt_field(value: str) -> str:
    """Encrypt sensitive field"""
    return cipher.encrypt(value.encode()).decode()

def decrypt_field(encrypted_value: str) -> str:
    """Decrypt sensitive field"""
    return cipher.decrypt(encrypted_value.encode()).decode()

# Usage in database
employee.ssn = encrypt_field("123-45-6789")
employee.bank_account = encrypt_field("1234567890")
```

**Estimated Time:** 2-3 days
- Add encryption functions (2 hours)
- Update database schema (2 hours)
- Migrate existing data (4 hours)
- Update API endpoints (4 hours)
- Testing (4 hours)

---

#### **2. Implement Comprehensive Audit Trail**

**Create audit log table:**
```sql
CREATE TABLE document_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES onboarding_form_data(id),
  document_path TEXT,
  accessed_by UUID REFERENCES users(id),
  access_type VARCHAR(50), -- 'upload', 'view', 'download', 'delete'
  ip_address VARCHAR(45),
  user_agent TEXT,
  accessed_at TIMESTAMP DEFAULT NOW(),
  property_id UUID REFERENCES properties(id)
);

CREATE INDEX idx_document_access_log_document ON document_access_log(document_id);
CREATE INDEX idx_document_access_log_user ON document_access_log(accessed_by);
CREATE INDEX idx_document_access_log_time ON document_access_log(accessed_at);
```

**Log all access:**
```python
async def log_document_access(
    document_id: str,
    document_path: str,
    user_id: str,
    access_type: str,
    ip_address: str,
    user_agent: str
):
    await supabase.table('document_access_log').insert({
        'document_id': document_id,
        'document_path': document_path,
        'accessed_by': user_id,
        'access_type': access_type,
        'ip_address': ip_address,
        'user_agent': user_agent
    })
```

**Estimated Time:** 1-2 days

---

### **Priority 2: HIGH (Implement Soon)**

#### **3. Signed URL Expiration Management**

**Set appropriate expiration times:**
```python
# Sensitive documents (I-9, W-4, Direct Deposit)
SENSITIVE_DOC_EXPIRY = 900  # 15 minutes

# Less sensitive documents (Company Policies, Training)
STANDARD_DOC_EXPIRY = 3600  # 1 hour

# Manager review documents
MANAGER_REVIEW_EXPIRY = 86400  # 24 hours

def create_signed_url(bucket: str, path: str, doc_type: str) -> str:
    expiry = SENSITIVE_DOC_EXPIRY if doc_type in ['i9', 'w4', 'direct-deposit'] else STANDARD_DOC_EXPIRY
    return supabase.storage.from_(bucket).create_signed_url(path, expires_in=expiry)
```

**Estimated Time:** 4 hours

---

#### **4. Automated Document Retention**

**Create retention cleanup job:**
```python
from datetime import datetime, timedelta

async def cleanup_expired_documents():
    """
    Delete documents that have passed their retention period.
    Run daily via cron job.
    """
    # Find documents past retention date
    expired_docs = await supabase.table('onboarding_form_data').select('*').lt(
        'retention_until', datetime.now().isoformat()
    ).execute()
    
    for doc in expired_docs.data:
        # Archive to cold storage first (optional)
        await archive_document(doc)
        
        # Delete from active storage
        await supabase.storage.from_(doc['bucket']).remove([doc['file_path']])
        
        # Mark as archived in database
        await supabase.table('onboarding_form_data').update({
            'archived': True,
            'archived_at': datetime.now().isoformat()
        }).eq('id', doc['id']).execute()
        
        # Log deletion
        await log_document_access(doc['id'], doc['file_path'], 'system', 'auto_delete', '0.0.0.0', 'retention_cleanup')
```

**Estimated Time:** 1 day

---

### **Priority 3: MEDIUM (Implement Later)**

#### **5. Role-Based Access Control (RBAC)**

**Implement manager-specific access:**
- Managers can only access documents for their property
- HR can access all documents
- Employees can only access their own documents (via signed URLs)

**Estimated Time:** 2-3 days

---

#### **6. Document Watermarking**

**Add watermarks to sensitive PDFs:**
- "CONFIDENTIAL - For Official Use Only"
- Employee name and date
- Prevents unauthorized sharing

**Estimated Time:** 1-2 days

---

## 📊 **SECURITY SCORECARD**

| Security Control | Status | Risk Level | Priority |
|-----------------|--------|------------|----------|
| Private Storage Buckets | ✅ GOOD | 🟢 LOW | - |
| RLS Policies | ✅ GOOD | 🟢 LOW | - |
| Supabase Encryption at Rest | ✅ GOOD | 🟢 LOW | - |
| Field-Level Encryption | ❌ MISSING | 🔴 HIGH | P1 |
| Audit Trail | ⚠️ PARTIAL | 🟡 MEDIUM | P1 |
| Signed URL Expiration | ⚠️ UNCLEAR | 🟡 MEDIUM | P2 |
| Document Retention Automation | ❌ MISSING | 🟡 MEDIUM | P2 |
| Role-Based Access Control | ⚠️ BASIC | 🟡 MEDIUM | P3 |
| Document Watermarking | ❌ MISSING | 🟢 LOW | P3 |

**Overall Security Rating:** 🟡 **MODERATE**

---

## ✅ **IMMEDIATE ACTION ITEMS**

1. **Add FIELD_ENCRYPTION_KEY to Heroku** (5 minutes)
2. **Implement field-level encryption** for SSN, bank accounts (2-3 days)
3. **Create document_access_log table** (1 hour)
4. **Add audit logging to all document operations** (1 day)
5. **Set signed URL expiration times** (4 hours)
6. **Create retention cleanup job** (1 day)

**Total Estimated Time:** 5-7 days for all Priority 1 & 2 items

---

**Conclusion:** The system has good baseline security (private buckets, RLS, Supabase encryption), but needs field-level encryption and comprehensive audit trails to meet enterprise security standards for handling sensitive PII.

