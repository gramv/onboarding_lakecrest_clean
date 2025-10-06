# Bucket Structure Analysis - Ethan Thomas (Completed Onboarding)

## 📂 **Complete Bucket Structure**

```
onboarding-documents/
  m6/
    ethan_thomas/
      ├── forms/
      │   ├── company_policies/
      │   │   └── company_policies_signed_20251003_123908_049cefc1-422f-4583-b071-cd51e6bd55ff.pdf
      │   │
      │   ├── i9_form/
      │   │   └── i9_form_signed_20251006_135201_*.pdf  (Employee Section 1 only)
      │   │
      │   ├── i9_form_verified/
      │   │   └── i9_form_verified_signed_20251006_135909_*.pdf  (Document verification)
      │   │
      │   ├── i9_form_completed/
      │   │   └── i9_form_completed_signed_20251006_135928_*.pdf  ← FINAL (Section 2 completed)
      │   │
      │   ├── w4_form/
      │   │   └── w4_form_signed_20251003_124028_63b04505-c1e9-429c-bd35-df7bb1970095.pdf  (employee only)
      │   │
      │   ├── w4_form_completed/
      │   │   └── w4_form_completed_signed_20251005_214746_1ba89854-b4af-4bf6-8750-ad7edd6b830f.pdf  ← FINAL (with employer section)
      │   │
      │   ├── direct_deposit/
      │   │   └── direct_deposit_signed_20251003_124129_fd5553ef-9863-4e41-b037-db9637f2ec1c.pdf
      │   │
      │   ├── health_insurance/
      │   │   └── health_insurance_signed_20251003_124634_5ddf9278-d871-4019-977f-4a0f3d265823.pdf  (employee only)
      │   │
      │   └── health_insurance_completed/
      │       ├── health_insurance_completed_signed_20251005_223045_c050f3c0-00da-4f8a-b24e-2adec3680842.pdf
      │       └── health_insurance_completed_signed_20251005_224232_43f46339-3bb3-49f2-baa0-8518e8f15b95.pdf  ← LATEST (with employer section)
      │
      └── uploads/
          └── i9_verification/
              ├── drivers_license/
              │   └── (image files)
              └── social_security_card/
                  └── (image files)
```

---

## 🔍 **Key Findings**

### **1. Document Organization Pattern**

**Employee-Signed Documents:**
- Stored in base folder: `forms/{document_type}/`
- Example: `forms/w4_form/w4_form_signed_TIMESTAMP_ID.pdf`

**Manager-Completed Documents:**
- Stored in `_completed` folder: `forms/{document_type}_completed/`
- Example: `forms/w4_form_completed/w4_form_completed_signed_TIMESTAMP_ID.pdf`

### **2. Naming Convention**

```
{document_type}_signed_{YYYYMMDD}_{HHMMSS}_{UUID}.pdf
```

Examples:
- `company_policies_signed_20251003_123908_049cefc1-422f-4583-b071-cd51e6bd55ff.pdf`
- `i9_form_signed_20251005_184619_9a020d82-a926-4b2c-9dce-f20e3507c358.pdf`
- `w4_form_completed_signed_20251005_214746_1ba89854-b4af-4bf6-8750-ad7edd6b830f.pdf`

### **3. Document Versions**

**Multiple Versions Exist:**
- I-9: 2 versions (original + manager-completed with Section 2)
- Health Insurance: 2 versions in completed folder (multiple manager submissions)

**Latest Version:**
- Determined by timestamp in filename
- Most recent timestamp = current version

### **4. I-9 Three-Stage Workflow**

**Stage 1: Employee Completes Section 1**
- Folder: `forms/i9_form/`
- File: `i9_form_signed_TIMESTAMP_ID.pdf`
- Contains: Employee information and attestation (Section 1)

**Stage 2: Manager Verifies Documents**
- Folder: `forms/i9_form_verified/`
- File: `i9_form_verified_signed_TIMESTAMP_ID.pdf`
- Contains: Document verification (preparer/translator section if needed)

**Stage 3: Manager Completes Section 2**
- Folder: `forms/i9_form_completed/`
- File: `i9_form_completed_signed_TIMESTAMP_ID.pdf`
- Contains: **FINAL VERSION** with employer review and verification (Section 2)

**This is the version to use for employee documents!** ✅

### **5. Supporting Documents**

**I-9 Verification Documents:**
- Location: `uploads/i9_verification/`
- Organized by document type:
  - `drivers_license/`
  - `social_security_card/`
  - `passport/`
  - (Could also have: `work_permit/`, `birth_certificate/`, etc.)

**Direct Deposit:**
- Voided check would be in: `uploads/direct_deposit/` (if uploaded)

---

## 📋 **Document Mapping for Employee Access**

### **Final Documents to Show:**

1. **Company Policies**
   - Path: `forms/company_policies/company_policies_signed_*.pdf`
   - Latest: Sort by timestamp, take most recent

2. **I-9 Employment Eligibility**
   - Path: `forms/i9_form_completed/i9_form_completed_signed_*.pdf` ✅
   - Latest: Most recent (has Section 2 completed by manager)
   - Note: Use `i9_form_completed` folder, not `i9_form` or `i9_form_verified`
   - Supporting: `uploads/i9_verification/{doc_type}/`

3. **W-4 Tax Withholding**
   - Path: `forms/w4_form_completed/w4_form_completed_signed_*.pdf`
   - Latest: Most recent (has employer section filled)
   - Note: Use `_completed` folder, not base `w4_form`

4. **Direct Deposit**
   - Path: `forms/direct_deposit/direct_deposit_signed_*.pdf`
   - Latest: Most recent
   - Supporting: `uploads/direct_deposit/` (if exists)

5. **Health Insurance**
   - Path: `forms/health_insurance_completed/health_insurance_completed_signed_*.pdf`
   - Latest: Most recent (has employer section filled)
   - Note: Use `_completed` folder, not base `health_insurance`

---

## 🔧 **Implementation Strategy**

### **For Complete Review Endpoint:**

**Step 1: Verify All Documents Approved**
```python
# Check document_approvals table
required_docs = ['company_policies', 'i9', 'w4', 'direct_deposit', 'health_insurance']
approvals = get_document_approvals(employee_id)

for doc_type in required_docs:
    if doc_type not in approvals or approvals[doc_type].status != 'approved':
        raise Exception(f"{doc_type} not approved")
```

**Step 2: Get Latest Document URLs**
```python
def get_latest_document(employee_id, property_id, doc_type):
    """Get the latest version of a document"""

    # Determine folder based on document type
    # Use _completed folders for documents that have manager sections
    if doc_type == 'i9':
        folder = "i9_form_completed"  # ✅ FINAL I-9 with Section 2
    elif doc_type == 'w4':
        folder = "w4_form_completed"  # ✅ FINAL W-4 with employer section
    elif doc_type == 'health_insurance':
        folder = "health_insurance_completed"  # ✅ FINAL Health Insurance with employer section
    elif doc_type == 'company_policies':
        folder = "company_policies"
    elif doc_type == 'direct_deposit':
        folder = "direct_deposit"
    else:
        folder = doc_type

    # List files in folder
    path = f"{property_name}/{employee_folder}/forms/{folder}"
    files = supabase.storage.from_('onboarding-documents').list(path)

    # Filter signed PDFs
    signed_files = [f for f in files if 'signed' in f['name'] and f['name'].endswith('.pdf')]

    # Sort by timestamp (in filename) - most recent first
    signed_files.sort(key=lambda x: x['name'], reverse=True)

    # Return latest
    if signed_files:
        latest = signed_files[0]
        full_path = f"{path}/{latest['name']}"
        return supabase.storage.from_('onboarding-documents').create_signed_url(full_path, 3600)

    return None
```

**Step 3: Get Supporting Documents**
```python
def get_i9_verification_docs(employee_id, property_id):
    """Get I-9 verification documents"""
    path = f"{property_name}/{employee_folder}/uploads/i9_verification"
    
    # List document types (folders)
    doc_types = supabase.storage.from_('onboarding-documents').list(path)
    
    verification_docs = []
    for doc_type in doc_types:
        if doc_type.get('id') is None:  # It's a folder
            type_name = doc_type['name']
            type_path = f"{path}/{type_name}"
            
            # List files in this type folder
            files = supabase.storage.from_('onboarding-documents').list(type_path)
            
            for file in files:
                if file.get('id'):  # It's a file
                    file_path = f"{type_path}/{file['name']}"
                    url = supabase.storage.from_('onboarding-documents').create_signed_url(file_path, 3600)
                    
                    verification_docs.append({
                        'type': type_name,
                        'filename': file['name'],
                        'url': url
                    })
    
    return verification_docs
```

---

## 📊 **Database Schema Needed**

### **employees table (already exists):**
```sql
- manager_review_status: 'pending' | 'in_progress' | 'completed'
- manager_review_completed_at: timestamp
- employment_status: 'pending' | 'active' | 'inactive'
- onboarding_status: 'not_started' | 'in_progress' | 'completed'
- employee_number: varchar
- start_date: date
```

### **document_approvals table (already exists):**
```sql
- employee_id: uuid
- document_type: varchar
- status: 'pending' | 'approved' | 'rejected'
- approved_by: uuid (manager_id)
- approved_at: timestamp
- notes: text
- form_data: jsonb
```

---

## ✅ **Ready to Implement**

With this structure, we can now:

1. ✅ **Verify all documents approved** - Check document_approvals table
2. ✅ **Get latest document URLs** - Use folder structure + timestamp sorting
3. ✅ **Get supporting documents** - Check uploads folder
4. ✅ **Update employee status** - Update employees table
5. ✅ **Send completion email** - Use employee + property + manager data
6. ✅ **Provide document access** - Return URLs for all final documents

**Next Step:** Implement the complete review endpoint! 🚀

