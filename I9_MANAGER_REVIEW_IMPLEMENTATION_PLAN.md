# I-9 Manager Review Implementation Plan

## 📋 **CURRENT STATE ANALYSIS**

### **What Employee Already Completed (During Onboarding):**

1. ✅ **I-9 Section 1** - Personal Information
   - Name, address, DOB, SSN
   - Citizenship status
   - Signature and date
   
2. ✅ **I-9 Section 2 - List A/B/C Documents**
   - Uploaded verification documents (DL, SSN, Passport, etc.)
   - OCR extracted document data
   - Document numbers, issuing authority, expiration dates
   - Data saved to database

3. ✅ **Generated PDF**
   - Section 1: FILLED ✅
   - Section 2 List A/B/C fields: FILLED ✅
   - Section 2 Employer fields: EMPTY ❌
   - Saved to: `onboarding-documents/{property}/{employee}/forms/i9_form/i9_form_signed_xxx.pdf`

4. ✅ **Uploaded Images**
   - Saved to: `onboarding-documents/{property}/{employee}/uploads/i9_verification/`
   - Folders: `drivers_license/`, `ssn_card/`, `passport/`

---

## 🎯 **WHAT MANAGER NEEDS TO DO**

### **Step 1: Load & Review**
```
┌─────────────────────────────────────────────────────────────┐
│  LEFT PANEL: PDF Viewer                                     │
│  - Display existing I-9 PDF (Section 1 + List A/B/C filled)│
│  - Highlight missing employer fields                        │
│  - Show editable form overlay                               │
│                                                              │
│  RIGHT PANEL: Document Verification                         │
│  - Tab 1: Driver's License image                           │
│  - Tab 2: SSN Card image                                   │
│  - Tab 3: Passport image (if applicable)                   │
│                                                              │
│  Manager verifies:                                          │
│  ✓ Document data in PDF matches uploaded images            │
│  ✓ Photos are clear and legible                            │
│  ✓ Documents are not expired                               │
└─────────────────────────────────────────────────────────────┘
```

### **Step 2: Fill Employer Data**
```
Manager clicks "Fill Employer Data" button
         ↓
Check employer_profiles table
         ↓
    ┌────────────────────────────────────┐
    │ IF employer_profile EXISTS:        │
    │ - Auto-fill all employer fields    │
    │ - Manager can edit if needed       │
    └────────────────────────────────────┘
         ↓
    ┌────────────────────────────────────┐
    │ IF employer_profile NOT EXISTS:    │
    │ - Show modal to collect:           │
    │   • Employer/Business Name         │
    │   • Business Address               │
    │   • City, State, ZIP               │
    │   • Manager Title                  │
    │ - Save to employer_profiles        │
    │ - Auto-fill PDF                    │
    └────────────────────────────────────┘
```

### **Step 3: Manager Signature & Complete**
```
Manager reviews final PDF
         ↓
Manager signs digitally
         ↓
Capture:
  - Signature image (base64)
  - Timestamp
  - IP address
  - User agent
         ↓
Generate FINAL PDF:
  ✓ Section 1 (employee filled)
  ✓ Section 2 List A/B/C (employee filled)
  ✓ Section 2 Employer fields (manager filled)
  ✓ Manager signature
  ✓ Date signed
         ↓
REPLACE old PDF in Supabase:
  DELETE: i9_form_signed_20251004_173814_xxx.pdf
  UPLOAD: i9_form_signed_20251005_XXXXXX_xxx.pdf
         ↓
Update document_approvals:
  status = 'approved'
  approved_by = manager_id
  approved_at = NOW()
  form_data = employer_data
  signature = base64_signature
```

---

## 🗄️ **DATABASE TABLES INVOLVED**

### **1. i9_section2_documents** (or similar)
```sql
-- Stores List A/B/C document data
{
  employee_id: UUID,
  document_type: 'drivers_license' | 'ssn_card' | 'passport',
  document_number: '123456789',
  issuing_authority: 'TENNESSEE',
  expiration_date: '2032-06-01',
  file_url: 'https://...',
  created_at: TIMESTAMP
}
```

### **2. employer_profiles**
```sql
-- Stores employer data for auto-fill
{
  id: UUID,
  property_id: UUID,
  i9_employer_name: 'John Smith',
  i9_employer_title: 'General Manager',
  i9_business_name: 'Hilton Downtown',
  i9_business_address: '123 Main St',
  city: 'Nashville',
  state: 'TN',
  zip_code: '37201',
  is_active: true
}
```

### **3. signed_documents**
```sql
-- Stores PDF metadata
{
  id: UUID,
  employee_id: UUID,
  document_type: 'i9_form',
  pdf_url: 'https://supabase.../i9_form_signed_xxx.pdf',
  storage_path: 'm6/benjamin_thomas/forms/i9_form/...',
  signed_at: TIMESTAMP,
  metadata: {bucket, path, size}
}
```

### **4. document_approvals**
```sql
-- Tracks approval status
{
  id: UUID,
  employee_id: UUID,
  document_type: 'i9',
  status: 'approved',
  approved_by: UUID,
  approved_at: TIMESTAMP,
  form_data: {employer_data},
  signature: 'base64...'
}
```

---

## 📝 **I-9 PDF FIELD MAPPING**

### **Section 1 (Employee - ALREADY FILLED):**
- `employee_last_name`
- `employee_first_name`
- `employee_middle_initial`
- `address_street`, `address_city`, `address_state`, `address_zip`
- `date_of_birth`
- `ssn`
- `citizenship_status` (checkbox)
- `employee_signature_date`

### **Section 2 List A/B/C (Employee - ALREADY FILLED):**
- `list_a_title` (e.g., "U.S. Passport")
- `list_a_authority` (e.g., "U.S. Department of State")
- `list_a_number` (e.g., "123456789")
- `list_a_expiration` (e.g., "06/01/2032")
- OR
- `list_b_title` + `list_c_title`
- `list_b_authority` + `list_c_authority`
- `list_b_number` + `list_c_number`
- `list_b_expiration` + `list_c_expiration`

### **Section 2 Employer (Manager - NEEDS TO FILL):**
- `first_day_employment` ⭐ REQUIRED
- `employer_last_name` ⭐ REQUIRED
- `employer_first_name` ⭐ REQUIRED
- `employer_title` ⭐ REQUIRED
- `employer_business_name` ⭐ REQUIRED
- `employer_address` ⭐ REQUIRED
- `employer_city` ⭐ REQUIRED
- `employer_state` ⭐ REQUIRED
- `employer_zip` ⭐ REQUIRED
- `employer_signature_date` ⭐ REQUIRED (auto-filled with today's date)

---

## 🔧 **IMPLEMENTATION TASKS**

### **Backend Tasks:**

1. ✅ **GET /api/manager/review/employees/{id}/document/i9** (ALREADY WORKING!)
   - Returns existing PDF URL
   - Returns uploaded images
   - Returns document data from DB
   - Returns employer profile (if exists)

2. ⭐ **GET /api/manager/review/employees/{id}/i9-section2-data**
   - Query `i9_section2_documents` or similar table
   - Return List A/B/C document data
   - Return uploaded image URLs

3. ⭐ **GET /api/manager/employer-profile/{property_id}**
   - Query `employer_profiles` table
   - Return active employer profile for property
   - Return null if doesn't exist

4. ⭐ **POST /api/manager/employer-profile**
   - Save employer data to `employer_profiles`
   - Set `is_active = true`
   - Return saved profile

5. ⭐ **POST /api/manager/review/employees/{id}/document/i9/complete**
   - Receive employer data + signature
   - Generate final PDF with all fields filled
   - Upload to Supabase storage (replace old PDF)
   - Update `signed_documents` table
   - Update `document_approvals` table
   - Return final PDF URL

### **Frontend Tasks:**

1. ⭐ **Create ManagerI9ReviewModal Component**
   - Dual-panel layout (PDF left, images right)
   - PDF viewer with form overlay
   - Image tabs for verification docs
   - Employer data form
   - Signature pad

2. ⭐ **Create EmployerDataModal Component**
   - Form to collect employer data
   - Validation
   - Save to backend

3. ⭐ **PDF Generation with Employer Data**
   - Load existing PDF
   - Fill employer fields
   - Add manager signature
   - Generate final PDF

4. ⭐ **Integration with DocumentWorkflowStepper**
   - Open ManagerI9ReviewModal when I-9 clicked
   - Pass employee data
   - Handle completion callback

---

## 🎯 **NEXT IMMEDIATE STEPS:**

1. Check sample I-9 PDF to understand exact field structure
2. Verify what data is in `i9_section2_documents` table
3. Build backend endpoint to fetch I-9 Section 2 data
4. Build ManagerI9ReviewModal component
5. Implement employer data auto-fill logic
6. Add signature capture
7. Generate and upload final PDF

---

**Ready to start implementation!** 🚀

