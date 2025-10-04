# 📐 Actual System Architecture - Document Storage & Manager Review

**Understanding how employee documents flow from onboarding to manager review**

---

## ✅ **How It Actually Works**

### **Employee Onboarding Completion:**

```
1. Employee completes onboarding steps
   ↓
2. Each step generates a PDF and saves to:
   - Database: Form data in tables (i9_forms, w4_forms, etc.)
   - Storage: PDF in Supabase Storage bucket
   - Metadata: signed_documents table
   ↓
3. Employee marks onboarding complete
   ↓
4. Employee status → "pending_manager_review"
   ↓
5. Manager sees employee in "Pending Reviews" tab
```

---

## 📁 **Actual Storage Structure**

### **Supabase Storage Bucket:**
```
Bucket: onboarding-documents (private)

Path Structure:
onboarding-documents/
└── {property_name}/              # e.g., "m6"
    └── {employee_name}/          # e.g., "John_Doe"
        ├── forms/                # Generated/Signed PDFs
        │   ├── company_policies/
        │   │   └── company_policies_signed_20251004_123456_uuid.pdf
        │   ├── i9_form/
        │   │   └── i9_form_signed_20251004_123456_uuid.pdf
        │   ├── w4_form/
        │   │   └── w4_form_signed_20251004_123456_uuid.pdf
        │   ├── direct_deposit/
        │   │   └── direct_deposit_signed_20251004_123456_uuid.pdf
        │   ├── health_insurance/
        │   │   └── health_insurance_signed_20251004_123456_uuid.pdf
        │   ├── human_trafficking/
        │   │   └── human_trafficking_signed_20251004_123456_uuid.pdf
        │   └── weapons_policy/
        │       └── weapons_policy_signed_20251004_123456_uuid.pdf
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

## 🗄️ **Database Tables**

### **1. i9_forms**
```sql
CREATE TABLE i9_forms (
  id UUID PRIMARY KEY,
  employee_id VARCHAR(255) NOT NULL,
  section VARCHAR(50) NOT NULL,  -- 'section_1' or 'section_2'
  data JSONB,                     -- Form field data
  completed_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**What's Stored:**
- Section 1: Employee-filled data (name, address, citizenship, etc.)
- Section 2: Manager-filled data (document verification) - **EMPTY until manager completes**

### **2. w4_forms**
```sql
CREATE TABLE w4_forms (
  id UUID PRIMARY KEY,
  employee_id VARCHAR(255) NOT NULL,
  data JSONB,                     -- Form field data
  pdf_url TEXT,
  signed_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**What's Stored:**
- W-4 form data (filing status, dependents, withholding, etc.)

### **3. signed_documents**
```sql
CREATE TABLE signed_documents (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL,
  document_type VARCHAR(50),      -- 'i9_form', 'w4_form', 'company_policies', etc.
  document_name VARCHAR(255),
  pdf_url TEXT,                   -- Signed URL to PDF in storage
  signed_at TIMESTAMP,
  property_id UUID,
  metadata JSONB                  -- {bucket, path, size, expires_at}
);
```

**What's Stored:**
- Metadata for ALL signed documents
- Links to PDFs in storage
- Signed URLs (expire after configured time)

### **4. document_approvals** (NEW - We just created)
```sql
CREATE TABLE document_approvals (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL,
  document_type VARCHAR(50),      -- 'company_policies', 'i9', 'w4', etc.
  status VARCHAR(20),             -- 'pending', 'approved', 'rejected'
  approved_by UUID,               -- Manager user ID
  approved_at TIMESTAMP,
  notes TEXT,                     -- Manager notes
  form_data JSONB,                -- Manager edits (for I-9 Section 2)
  signature TEXT,                 -- Base64 signature (for I-9)
  UNIQUE(employee_id, document_type)
);
```

**What's Stored:**
- Manager approval status for each document
- Manager edits to forms
- Manager signatures

---

## 🔄 **Manager Review Workflow**

### **Current Implementation (What We're Replacing):**

```
1. Manager clicks "Review & Complete I-9"
2. OTP verification
3. Manager sees I-9 Section 1 data (from i9_forms table)
4. Manager fills I-9 Section 2
5. Manager signs
6. System saves Section 2 to i9_forms table
7. Done
```

**Problem:** Only reviews I-9, doesn't verify other documents

---

### **New Implementation (What We're Building):**

```
1. Manager clicks "Review & Complete I-9"
   ↓
2. OTP verification (30-min session, persistent)
   ↓
3. System shows sequential workflow:
   
   Step 1: Company Policies ✅ Can Review
   Step 2: I-9 Form 🔒 Locked
   Step 3: W-4 Form 🔒 Locked
   Step 4: Direct Deposit 🔒 Locked
   Step 5: Health Insurance 🔒 Locked
   
   ↓
4. Manager reviews Company Policies PDF
   - Fetches from: onboarding-documents/{property}/{employee}/forms/company_policies/
   - Checks signature
   - Approves or Rejects
   
   ↓
5. If APPROVED:
   - Save to document_approvals table
   - Unlock Step 2 (I-9)
   
   ↓
6. Manager reviews I-9
   - Fetch Section 1 PDF from storage
   - Fetch uploaded docs (DL, Passport, SSN) from uploads/i9_verification/
   - Compare information
   - Fill Section 2 form
   - Sign Section 2
   - Approve
   - Generate final I-9 PDF (Section 1 + Section 2 combined)
   - Replace original PDF in storage
   
   ↓
7. Continue through all steps...
   
   ↓
8. All approved → Employee onboarding complete!
```

---

## 🎯 **What Manager Needs to Review**

### **Documents in Sequential Order:**

| Step | Document | Source | What Manager Does |
|------|----------|--------|-------------------|
| 1 | Company Policies | `forms/company_policies/` | Verify signature |
| 2 | I-9 Form | `forms/i9_form/` + `uploads/i9_verification/` | Compare with uploaded docs, fill Section 2, sign |
| 3 | W-4 Form | `forms/w4_form/` + `uploads/i9_verification/ssn_card/` | Verify SSN matches |
| 4 | Direct Deposit | `forms/direct_deposit/` | Verify routing/account numbers (voided check embedded in PDF) |
| 5 | Health Insurance | `forms/health_insurance/` | Review enrollment |

---

## 📊 **Data Flow**

### **Employee Completes Onboarding:**

```
Frontend (Employee)
  ↓ Fills forms
  ↓ Signs documents
  ↓ Uploads verification docs
  ↓
Backend API
  ↓ POST /onboarding/{id}/i9-section1
  ↓ POST /onboarding/{id}/w4-form
  ↓ POST /onboarding/{id}/company-policies
  ↓
Supabase Service
  ↓ save_signed_document()
  ↓ Generates PDF
  ↓ Uploads to storage: onboarding-documents/{property}/{employee}/forms/{type}/
  ↓ Saves metadata to: signed_documents table
  ↓ Saves form data to: i9_forms, w4_forms tables
  ↓
Employee Status → "pending_manager_review"
```

### **Manager Reviews Documents:**

```
Frontend (Manager)
  ↓ Clicks "Review & Complete I-9"
  ↓ OTP verification
  ↓
Backend API
  ↓ GET /manager/review/employees/{id}/documents-status
  ↓ Returns: All documents with approval status
  ↓
Frontend
  ↓ Shows sequential workflow
  ↓ Manager clicks on Step 1 (Company Policies)
  ↓
Backend API
  ↓ GET /manager/review/employees/{id}/document/company_policies
  ↓ Fetches PDF from storage
  ↓ Returns signed URL
  ↓
Frontend
  ↓ Displays PDF
  ↓ Manager clicks "Approve"
  ↓
Backend API
  ↓ POST /manager/review/employees/{id}/document/company_policies/approve
  ↓ Saves to document_approvals table
  ↓ Returns success
  ↓
Frontend
  ↓ Unlocks Step 2 (I-9)
  ↓ Manager continues...
```

---

## 🔑 **Key Points**

1. **PDFs are already in storage** - Employee onboarding saves them
2. **Form data is in database** - i9_forms, w4_forms tables
3. **Manager fetches from storage** - Using signed URLs
4. **Manager approves sequentially** - Can't skip steps
5. **Final PDFs replace originals** - After manager edits/signs

---

## ✅ **What We Built**

1. ✅ **Backend endpoints** to fetch documents from storage
2. ✅ **Sequential workflow** enforcement
3. ✅ **document_approvals table** to track status
4. ✅ **Session persistence** for manager review

---

## ⏳ **What's Next**

1. **UI Components** to display PDFs and workflow
2. **PDF regeneration** for I-9 (combine Section 1 + Section 2)
3. **Signature capture** for I-9 Section 2
4. **Storage replacement** logic (replace original with final)

---

**Now the architecture is clear! Documents are already in storage, manager just needs to review and approve them sequentially.** ✅

