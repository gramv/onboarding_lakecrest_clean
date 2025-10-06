# I-9 Manager Review - Complete Data Mapping & Implementation Status

## ✅ **WHAT'S ALREADY IMPLEMENTED**

### **Frontend Components:**
1. ✅ `I9ReviewModal.tsx` - Main modal with 3-column layout
2. ✅ `PDFViewer.tsx` - Left panel PDF viewer
3. ✅ `ImageViewer.tsx` - Middle panel image tabs
4. ✅ `EmployerForm.tsx` - Right panel employer form
5. ✅ `EmployerSetupModal.tsx` - Modal for first-time employer data
6. ✅ `managerReviewService.ts` - API service layer

### **Backend Endpoints:**
1. ✅ `GET /api/manager/review/{employee_id}/documents/i9/detail` - Get I-9 data
2. ✅ `POST /api/manager/review/{employee_id}/documents/i9/complete` - Complete I-9
3. ✅ `POST /api/manager/review/employer-profile/quick-save` - Save employer profile

### **Database Tables:**
1. ✅ `i9_documents` - Stores uploaded document metadata
2. ✅ `i9_section2_documents` - Stores List A/B/C document data
3. ✅ `i9_forms` - Stores Section 1 and Section 2 form data
4. ✅ `employer_profiles` - Stores employer data for auto-fill
5. ✅ `signed_documents` - Stores PDF metadata
6. ✅ `document_approvals` - Tracks approval status

---

## 📊 **DATA FLOW MAPPING**

### **Step 1: Employee Completes Onboarding**

```
Employee fills I-9 Section 1
         ↓
Employee uploads verification docs (DL, SSN, Passport)
         ↓
OCR extracts data from images
         ↓
Employee confirms/edits extracted data
         ↓
Data saved to database:
  ┌─────────────────────────────────────────────────────┐
  │ TABLE: i9_documents                                 │
  │ - employee_id                                       │
  │ - document_type: 'drivers_license'                  │
  │ - document_list: 'list_b'                          │
  │ - document_number: '123456789'                      │
  │ - issuing_authority: 'TENNESSEE'                    │
  │ - expiration_date: '2032-06-01'                     │
  │ - file_url: 'https://...'                          │
  │ - storage_path: 'm6/benjamin_thomas/uploads/...'   │
  └─────────────────────────────────────────────────────┘
         ↓
  ┌─────────────────────────────────────────────────────┐
  │ TABLE: i9_section2_documents (if exists)            │
  │ - employee_id                                       │
  │ - document_1_title: "Driver's License"              │
  │ - document_1_number: '123456789'                    │
  │ - document_1_authority: 'TENNESSEE'                 │
  │ - document_1_expiration: '2032-06-01'               │
  │ - document_2_title: "Social Security Card"          │
  │ - document_2_number: 'XXX-XX-1234'                  │
  │ - document_2_authority: 'SSA'                       │
  └─────────────────────────────────────────────────────┘
         ↓
PDF generated with Section 1 + List A/B/C filled
         ↓
  ┌─────────────────────────────────────────────────────┐
  │ TABLE: signed_documents                             │
  │ - employee_id                                       │
  │ - document_type: 'i9_form'                          │
  │ - pdf_url: 'https://...'                           │
  │ - storage_path: 'm6/benjamin_thomas/forms/i9_form/' │
  │ - signed_at: '2025-10-04T17:46:16'                 │
  └─────────────────────────────────────────────────────┘
         ↓
Images saved to storage:
  onboarding-documents/m6/benjamin_thomas/uploads/i9_verification/
    ├── drivers_license/dl_front.jpg
    ├── ssn_card/ssn.jpg
    └── passport/passport.jpg (if applicable)
```

---

### **Step 2: Manager Opens I-9 Review**

```
Manager clicks "Review I-9" button
         ↓
Frontend calls: GET /api/manager/review/{employee_id}/documents/i9/detail
         ↓
Backend returns:
{
  "pdfUrl": "https://supabase.../i9_form_signed_xxx.pdf",
  "uploadedDocuments": [
    {
      "id": "...",
      "document_type": "drivers_license",
      "file_name": "dl_front.jpg",
      "url": "https://..."
    },
    {
      "id": "...",
      "document_type": "ssn_card",
      "file_name": "ssn.jpg",
      "url": "https://..."
    }
  ],
  "documentsMetadata": [
    {
      "employee_id": "...",
      "document_type": "drivers_license",
      "document_list": "list_b",
      "document_number": "123456789",
      "issuing_authority": "TENNESSEE",
      "expiration_date": "2032-06-01"
    },
    {
      "employee_id": "...",
      "document_type": "social_security_card",
      "document_list": "list_c",
      "document_number": "XXX-XX-1234",
      "issuing_authority": "SSA"
    }
  ],
  "section1Form": {
    "employee_id": "...",
    "section": "section1",
    "form_data": {
      "first_name": "Benjamin",
      "last_name": "Thomas",
      "date_of_birth": "1990-01-01",
      "ssn": "XXX-XX-1234",
      "citizenship_status": "citizen"
    }
  },
  "section2Form": null,  // Not filled yet
  "employerProfile": {
    "i9_employer_name": "John Smith",
    "i9_employer_title": "General Manager",
    "i9_business_name": "Hilton Downtown",
    "i9_business_address": "123 Main St",
    "city": "Nashville",
    "state": "TN",
    "zip_code": "37201"
  } OR null  // If first time
}
```

---

### **Step 3: Manager Reviews & Fills Employer Data**

```
I9ReviewModal displays:
  ┌─────────────────────────────────────────────────────────────┐
  │  LEFT: PDF Viewer                                           │
  │  - Shows existing PDF (Section 1 + List A/B/C filled)      │
  │  - Employer fields are EMPTY                                │
  │                                                              │
  │  MIDDLE: Image Viewer                                       │
  │  - Tab 1: Driver's License image                           │
  │  - Tab 2: SSN Card image                                   │
  │  - Tab 3: Passport (if applicable)                         │
  │                                                              │
  │  RIGHT: Employer Form                                       │
  │  - First Day of Employment (required)                      │
  │  - Employer Name (auto-filled if profile exists)           │
  │  - Employer Title (auto-filled if profile exists)          │
  │  - Business Name (auto-filled if profile exists)           │
  │  - Business Address (auto-filled if profile exists)        │
  │  - City, State, ZIP (auto-filled if profile exists)        │
  │  - Signature Pad                                            │
  │  - [Complete & Sign] button                                │
  └─────────────────────────────────────────────────────────────┘

IF employerProfile is NULL:
  EmployerSetupModal appears:
    - Collect employer data
    - Save to employer_profiles table
    - Auto-fill form
```

---

### **Step 4: Manager Completes I-9**

```
Manager clicks "Complete & Sign I-9 Section 2"
         ↓
Frontend calls: POST /api/manager/review/{employee_id}/documents/i9/complete
Body: {
  "firstDayOfEmployment": "2025-10-11",
  "employerName": "John Smith",
  "employerTitle": "General Manager",
  "businessName": "Hilton Downtown",
  "businessAddress": "123 Main St",
  "city": "Nashville",
  "state": "TN",
  "zipCode": "37201",
  "signature": {
    "dataUrl": "data:image/png;base64,...",
    "timestamp": "2025-10-05T12:00:00Z",
    "ipAddress": "96.225.76.201",
    "userAgent": "Mozilla/5.0..."
  },
  "signatureDate": "2025-10-05",
  "updateEmployerProfile": true
}
         ↓
Backend:
  1. Load existing PDF from storage
  2. Fill Section 2 employer fields using PyMuPDF
  3. Add manager signature to PDF
  4. Generate final PDF bytes
  5. Upload to Supabase storage (REPLACE old PDF)
  6. Update signed_documents table
  7. Update document_approvals table
  8. Update employees table (i9_section2_status = 'completed')
  9. Save/update employer_profiles table (if updateEmployerProfile = true)
         ↓
Return: {
  "success": true,
  "message": "I-9 Section 2 completed successfully",
  "finalPdfUrl": "https://supabase.../i9_form_signed_NEW.pdf"
}
```

---

## 🎯 **WHAT NEEDS TO BE MAPPED/VERIFIED**

### **1. Check i9_section2_documents Table Structure**
```sql
-- Does this table exist?
SELECT * FROM i9_section2_documents WHERE employee_id = '...';

-- OR is the data in i9_documents table?
SELECT * FROM i9_documents WHERE employee_id = '...';
```

### **2. Verify PDF Field Names**
- Check sample PDF to confirm exact field names for Section 2 employer fields
- Map backend field names to PDF form field names

### **3. Confirm Data Sources**
- ✅ Section 1 data: `i9_forms` table (section = 'section1')
- ❓ List A/B/C data: `i9_documents` OR `i9_section2_documents`?
- ✅ Employer data: `employer_profiles` table
- ✅ PDF location: `signed_documents` table

---

## 🔧 **NEXT STEPS**

1. ✅ Verify I-9 PDF loads correctly (DONE - path fixed to `forms/i9_form`)
2. ⭐ Check which table has List A/B/C document data
3. ⭐ Verify PDF field mapping for Section 2 employer fields
4. ⭐ Test complete flow end-to-end
5. ⭐ Handle edge cases (missing data, expired documents, etc.)

---

**Ready to verify data sources and complete the implementation!** 🚀

