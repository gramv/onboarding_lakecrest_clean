# Corrected Bucket Structure - I-9 Three-Stage Workflow

## 🔍 **Discovery**

After checking `m6/christopher_thomas_3`, we found the **correct I-9 workflow** uses THREE separate folders, not one!

---

## 📂 **Correct Document Structure**

```
onboarding-documents/
  m6/
    christopher_thomas_3/
      ├── forms/
      │   ├── company_policies/
      │   │   └── company_policies_signed_*.pdf
      │   │
      │   ├── i9_form/                          ← Stage 1: Employee Section 1
      │   │   └── i9_form_signed_*.pdf
      │   │
      │   ├── i9_form_verified/                 ← Stage 2: Document Verification
      │   │   └── i9_form_verified_signed_*.pdf
      │   │
      │   ├── i9_form_completed/                ← Stage 3: FINAL (Section 2) ✅
      │   │   └── i9_form_completed_signed_*.pdf
      │   │
      │   ├── w4_form/
      │   │   └── w4_form_signed_*.pdf          (employee only)
      │   │
      │   ├── w4_form_completed/                ← FINAL W-4 ✅
      │   │   └── w4_form_completed_signed_*.pdf
      │   │
      │   ├── direct_deposit/
      │   │   └── direct_deposit_signed_*.pdf
      │   │
      │   ├── health_insurance/
      │   │   └── health_insurance_signed_*.pdf  (employee only)
      │   │
      │   └── health_insurance_completed/       ← FINAL Health Insurance ✅
      │       └── health_insurance_completed_signed_*.pdf
      │
      └── uploads/
          └── i9_verification/
              ├── drivers_license/
              │   └── 20251006_135135_TN_D200_PR_Adult_CLASS-M_DL.jpg
              └── social_security_card/
                  └── 20251006_135151_ss-example-card.jpg
```

---

## 🔄 **I-9 Three-Stage Workflow**

### **Stage 1: Employee Completes Section 1**
- **Folder:** `forms/i9_form/`
- **File:** `i9_form_signed_TIMESTAMP_ID.pdf`
- **Contains:** 
  - Employee personal information
  - Citizenship/immigration status attestation
  - Employee signature
- **When:** During employee onboarding (before/on first day)

### **Stage 2: Manager Verifies Documents**
- **Folder:** `forms/i9_form_verified/`
- **File:** `i9_form_verified_signed_TIMESTAMP_ID.pdf`
- **Contains:**
  - Document verification
  - Preparer/Translator section (if applicable)
  - Initial document review
- **When:** Manager reviews uploaded verification documents

### **Stage 3: Manager Completes Section 2** ✅
- **Folder:** `forms/i9_form_completed/`
- **File:** `i9_form_completed_signed_TIMESTAMP_ID.pdf`
- **Contains:**
  - **COMPLETE I-9 FORM**
  - Section 1 (employee)
  - Section 2 (employer review and verification)
  - Document information (List A, B, C)
  - Employer signature and date
- **When:** Manager completes I-9 review (within 3 business days of hire)
- **This is the FINAL version to use!** ✅

---

## 📋 **Final Documents for Employee Access**

When providing documents to employee or for download, use these folders:

| Document | Folder | File Pattern |
|----------|--------|--------------|
| Company Policies | `company_policies/` | `company_policies_signed_*.pdf` |
| **I-9** | **`i9_form_completed/`** ✅ | `i9_form_completed_signed_*.pdf` |
| **W-4** | **`w4_form_completed/`** ✅ | `w4_form_completed_signed_*.pdf` |
| Direct Deposit | `direct_deposit/` | `direct_deposit_signed_*.pdf` |
| **Health Insurance** | **`health_insurance_completed/`** ✅ | `health_insurance_completed_signed_*.pdf` |

**Key Rule:** For documents with manager sections (I-9, W-4, Health Insurance), always use the `_completed` folder!

---

## 🔧 **Implementation Code**

### **Get Latest Document Function:**

```python
def get_latest_document(property_name, employee_folder, doc_type):
    """
    Get the latest version of a completed document
    
    Args:
        property_name: e.g., "m6"
        employee_folder: e.g., "christopher_thomas_3"
        doc_type: "company_policies", "i9", "w4", "direct_deposit", "health_insurance"
    
    Returns:
        Signed URL to the latest document PDF
    """
    
    # Map document type to folder name
    folder_map = {
        'company_policies': 'company_policies',
        'i9': 'i9_form_completed',           # ✅ FINAL I-9
        'w4': 'w4_form_completed',           # ✅ FINAL W-4
        'direct_deposit': 'direct_deposit',
        'health_insurance': 'health_insurance_completed'  # ✅ FINAL Health Insurance
    }
    
    folder = folder_map.get(doc_type, doc_type)
    path = f"{property_name}/{employee_folder}/forms/{folder}"
    
    # List files in folder
    files = supabase.storage.from_('onboarding-documents').list(path)
    
    # Filter for signed PDFs
    signed_pdfs = [
        f for f in files 
        if f.get('name', '').endswith('.pdf') and 'signed' in f.get('name', '')
    ]
    
    if not signed_pdfs:
        return None
    
    # Sort by filename (timestamp is in filename) - most recent first
    signed_pdfs.sort(key=lambda x: x.get('name', ''), reverse=True)
    
    # Get the latest
    latest = signed_pdfs[0]
    full_path = f"{path}/{latest['name']}"
    
    # Create signed URL (valid for 1 hour)
    url_response = supabase.storage.from_('onboarding-documents').create_signed_url(full_path, 3600)
    
    if isinstance(url_response, dict):
        return url_response.get('signedURL')
    
    return url_response
```

### **Get I-9 Verification Documents:**

```python
def get_i9_verification_documents(property_name, employee_folder):
    """
    Get all I-9 verification documents (uploaded images)
    
    Returns:
        List of verification documents with type and URL
    """
    
    base_path = f"{property_name}/{employee_folder}/uploads/i9_verification"
    
    # List document type folders (drivers_license, social_security_card, passport, etc.)
    doc_types = supabase.storage.from_('onboarding-documents').list(base_path)
    
    verification_docs = []
    
    for doc_type_item in doc_types:
        doc_type_name = doc_type_item.get('name', '')
        
        # Skip if it's a file (we want folders)
        if doc_type_item.get('id') is not None:
            continue
        
        # List files in this document type folder
        type_path = f"{base_path}/{doc_type_name}"
        files = supabase.storage.from_('onboarding-documents').list(type_path)
        
        for file_item in files:
            file_name = file_item.get('name', '')
            
            # Skip folders
            if file_item.get('id') is None:
                continue
            
            # Create signed URL
            file_path = f"{type_path}/{file_name}"
            url_response = supabase.storage.from_('onboarding-documents').create_signed_url(file_path, 3600)
            
            url = url_response.get('signedURL') if isinstance(url_response, dict) else url_response
            
            verification_docs.append({
                'type': doc_type_name,
                'filename': file_name,
                'url': url
            })
    
    return verification_docs
```

---

## ✅ **Updated Implementation Checklist**

### **For Complete Review Endpoint:**

1. ✅ Get final documents:
   - Company Policies: `company_policies/`
   - **I-9: `i9_form_completed/`** (not `i9_form`)
   - **W-4: `w4_form_completed/`**
   - Direct Deposit: `direct_deposit/`
   - **Health Insurance: `health_insurance_completed/`**

2. ✅ Get supporting documents:
   - I-9 verification: `uploads/i9_verification/{doc_type}/`
   - Direct Deposit voided check: `uploads/direct_deposit/` (if exists)

3. ✅ Sort by timestamp in filename to get latest version

4. ✅ Create signed URLs (1 hour expiry)

---

## 🎯 **Key Takeaways**

1. **I-9 has THREE stages**, not one:
   - `i9_form` → Employee Section 1
   - `i9_form_verified` → Document verification
   - `i9_form_completed` → **FINAL** (use this!)

2. **Always use `_completed` folders** for:
   - I-9 (`i9_form_completed`)
   - W-4 (`w4_form_completed`)
   - Health Insurance (`health_insurance_completed`)

3. **Sort by filename** to get latest version (timestamp is in filename)

4. **Verification documents** are in `uploads/i9_verification/{doc_type}/`

---

## 🚀 **Ready to Implement**

With this corrected understanding, we can now properly implement:
- ✅ Complete review endpoint
- ✅ Employee document access
- ✅ Email with correct document links
- ✅ Document download functionality

**The structure is now clear!** 🎉

