# 📋 Sequential Document Approval Workflow Guide

**Complete manager review and approval system with sequential workflow**

---

## ✅ **What Was Built**

### **1. Sequential 5-Step Workflow**

```
Step 1: Company Policies Acknowledgment
   ↓ (must approve to unlock next)
Step 2: I-9 Employment Eligibility Verification
   ↓ (must approve to unlock next)
Step 3: W-4 Federal Tax Withholding
   ↓ (must approve to unlock next)
Step 4: Direct Deposit Authorization
   ↓ (must approve to unlock next)
Step 5: Health Insurance Enrollment
   ↓
COMPLETE! ✅
```

---

## 🔄 **How It Works**

### **Manager Workflow:**

```
1. Manager clicks "Review & Complete I-9"
   ↓
2. OTP Verification (already working)
   ↓
3. Session created (30 minutes, persistent)
   ↓
4. Document workflow loads:
   
   ✅ Step 1: Company Policies (Can Review)
   🔒 Step 2: I-9 (Locked)
   🔒 Step 3: W-4 (Locked)
   🔒 Step 4: Direct Deposit (Locked)
   🔒 Step 5: Health Insurance (Locked)
   
   ↓
5. Manager reviews Company Policies PDF
   - Check employee signature
   - Verify date
   - Approve or Reject
   
   ↓
6. If APPROVED → Step 2 unlocks
   If REJECTED → Employee notified to resubmit
   
   ↓
7. Manager reviews I-9
   - View Section 1 PDF (employee filled)
   - View uploaded documents (DL/Passport/SSN)
   - Compare information
   - Fill Section 2 form
   - Sign Section 2
   - Approve → Regenerate final I-9 PDF
   
   ↓
8. Continue through all steps...
   
   ↓
9. All approved → Employee onboarding complete!
```

---

## 📁 **Storage Structure**

### **Employee Documents:**

```
onboarding-documents/
└── Hilton_Downtown/              # Property name
    └── John_Doe/                 # Employee name
        ├── forms/                # Generated/Signed PDFs
        │   ├── company_policies/
        │   │   └── company_policies_signed_20251004_123456_uuid.pdf
        │   │
        │   ├── i9/
        │   │   └── i9_signed_20251004_123456_uuid.pdf
        │   │       ↑ REPLACED after manager approval with final version
        │   │
        │   ├── w4/
        │   │   └── w4_signed_20251004_123456_uuid.pdf
        │   │       ↑ REPLACED after manager approval
        │   │
        │   ├── direct_deposit/
        │   │   └── direct_deposit_signed_20251004_123456_uuid.pdf
        │   │       ↑ Contains form + voided check image
        │   │
        │   └── health_insurance/
        │       └── health_insurance_signed_20251004_123456_uuid.pdf
        │
        └── uploads/              # Employee uploaded documents
            └── i9_verification/
                ├── drivers_license/
                │   └── dl_front.jpg
                ├── passport/
                │   └── passport.jpg
                └── ssn_card/
                    └── ssn.jpg
```

---

## 🎯 **Each Document Step**

### **Step 1: Company Policies**

**Manager Actions:**
- ✅ View company policies PDF
- ✅ Verify employee signature exists
- ✅ Check signature date
- ✅ Confirm all pages signed
- ✅ Approve or Reject

**API Calls:**
```typescript
// Get document
GET /api/manager/review/employees/{id}/document/company_policies

// Approve
POST /api/manager/review/employees/{id}/document/company_policies/approve
{
  "notes": "Signature verified"
}

// Reject
POST /api/manager/review/employees/{id}/document/company_policies/reject
{
  "reason": "Signature missing on page 3"
}
```

---

### **Step 2: I-9 Form**

**Manager Actions:**
- ✅ View Section 1 PDF (employee completed)
- ✅ View uploaded documents (DL, Passport, SSN)
- ✅ Compare information matches
- ✅ Verify document authenticity
- ✅ Fill Section 2 form fields
- ✅ Sign Section 2
- ✅ Approve → Regenerate complete I-9 PDF

**API Calls:**
```typescript
// Get document + uploaded docs
GET /api/manager/review/employees/{id}/document/i9
Response:
{
  "pdfUrl": "https://...",
  "uploadedDocsUrls": [
    {
      "type": "drivers_license",
      "url": "https://...",
      "filename": "dl_front.jpg"
    },
    {
      "type": "passport",
      "url": "https://...",
      "filename": "passport.jpg"
    }
  ]
}

// Approve with Section 2 data
POST /api/manager/review/employees/{id}/document/i9/approve
{
  "form_data": {
    "document_title": "U.S. Passport",
    "document_number": "123456789",
    "expiration_date": "2030-12-31",
    "employee_first_day": "2025-10-15"
  },
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "notes": "Documents verified"
}
```

---

### **Step 3: W-4 Form**

**Manager Actions:**
- ✅ View W-4 PDF
- ✅ View SSN card image
- ✅ Verify SSN matches
- ✅ Check withholding allowances
- ✅ Verify signature and date
- ✅ Approve or Reject

**API Calls:**
```typescript
// Get document + SSN card
GET /api/manager/review/employees/{id}/document/w4
Response:
{
  "pdfUrl": "https://...",
  "uploadedDocsUrls": [
    {
      "type": "ssn_card",
      "url": "https://...",
      "filename": "ssn.jpg"
    }
  ]
}

// Approve
POST /api/manager/review/employees/{id}/document/w4/approve
{
  "notes": "SSN verified"
}
```

---

### **Step 4: Direct Deposit**

**Manager Actions:**
- ✅ View direct deposit PDF (contains form + voided check)
- ✅ Verify routing number matches check
- ✅ Verify account number matches check
- ✅ Confirm check is properly voided
- ✅ Check account type (Checking/Savings)
- ✅ Approve or Reject

**API Calls:**
```typescript
// Get document (PDF already contains voided check)
GET /api/manager/review/employees/{id}/document/direct_deposit
Response:
{
  "pdfUrl": "https://..."  // PDF with form + check image
}

// Approve
POST /api/manager/review/employees/{id}/document/direct_deposit/approve
{
  "notes": "Account numbers verified"
}
```

---

### **Step 5: Health Insurance**

**Manager Actions:**
- ✅ View health insurance enrollment PDF
- ✅ Review plan selections
- ✅ Verify dependent information (if applicable)
- ✅ Confirm coverage start date
- ✅ Check signature and date
- ✅ Approve or Reject

**API Calls:**
```typescript
// Get document
GET /api/manager/review/employees/{id}/document/health_insurance

// Approve
POST /api/manager/review/employees/{id}/document/health_insurance/approve
{
  "notes": "Enrollment verified"
}
```

---

## 🗄️ **Database Schema**

### **document_approvals Table:**

```sql
CREATE TABLE document_approvals (
    id UUID PRIMARY KEY,
    employee_id UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL,  -- 'company_policies', 'i9', 'w4', etc.
    status VARCHAR(20) NOT NULL,         -- 'pending', 'approved', 'rejected'
    approved_by UUID,                    -- Manager user ID
    approved_at TIMESTAMP,
    notes TEXT,                          -- Manager notes
    form_data JSONB,                     -- Manager edits (for I-9 Section 2)
    signature TEXT,                      -- Base64 signature (for I-9)
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    UNIQUE(employee_id, document_type)
);
```

---

## 🔒 **Sequential Enforcement**

### **Backend Logic:**

```python
# Check if previous document is approved
if workflow_step['order'] > 1:
    prev_step = DOCUMENT_WORKFLOW[workflow_step['order'] - 2]
    prev_approval = get_approval(employee_id, prev_step['type'])
    
    if not prev_approval or prev_approval.status != 'approved':
        raise HTTPException(
            status_code=400,
            detail=f"Previous document ({prev_step['name']}) must be approved first"
        )
```

### **Frontend Logic:**

```typescript
// Check if can review document
static canReviewDocument(status: AllDocumentsStatus, documentType: string): boolean {
  const doc = status.documents.find(d => d.documentType === documentType);
  if (!doc) return false;

  // First document can always be reviewed
  if (doc.order === 1) return true;

  // Check if previous document is approved
  const previousDoc = status.documents.find(d => d.order === doc.order - 1);
  return previousDoc?.status === 'approved';
}
```

---

## 📊 **Progress Tracking**

### **Get Overall Status:**

```typescript
GET /api/manager/review/employees/{id}/documents-status

Response:
{
  "employeeId": "7bda8a8e-b2f6-4052-ad46-6f322836c3e8",
  "employeeName": "John Doe",
  "propertyName": "Hilton Downtown",
  "documents": [
    {
      "documentType": "company_policies",
      "documentName": "Company Policies Acknowledgment",
      "status": "approved",
      "approvedBy": "manager-uuid",
      "approvedAt": "2025-10-04T10:30:00Z",
      "order": 1,
      "canReview": true
    },
    {
      "documentType": "i9",
      "documentName": "I-9 Employment Eligibility Verification",
      "status": "in_review",
      "order": 2,
      "canReview": true  // Previous is approved
    },
    {
      "documentType": "w4",
      "documentName": "W-4 Federal Tax Withholding",
      "status": "pending",
      "order": 3,
      "canReview": false  // Previous not approved yet
    }
  ],
  "currentStep": 2,
  "overallStatus": "in_progress",
  "completionPercentage": 20,
  "lastUpdated": "2025-10-04T10:35:00Z"
}
```

---

## 🚀 **Next Steps**

### **1. Run Database Migration:**

```sql
-- In Supabase SQL Editor
-- Run: backend/migrations/create_document_approvals_table.sql
```

### **2. Build UI Components:**

- Document workflow stepper
- PDF viewer with side-by-side comparison
- Form editor for I-9 Section 2
- Signature capture component
- Approve/Reject buttons

### **3. Implement PDF Regeneration:**

- I-9: Combine Section 1 + Section 2
- W-4: Add manager approval stamp
- Direct Deposit: Already combined
- Health Insurance: Add approval stamp

### **4. Test Workflow:**

- Test sequential enforcement
- Test approve/reject flow
- Test PDF replacement
- Test session persistence

---

**The backend is ready! Time to build the UI!** 🎨✅


