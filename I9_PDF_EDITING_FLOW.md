# I-9 Manager Review - PDF Editing Flow

## 🎯 **Correct Understanding**

### **What Manager Does:**
1. Opens the **existing I-9 PDF** (Section 1 filled by employee)
2. **Edits the PDF directly** to fill Section 2 fields
3. Signs the PDF
4. Saves the **final PDF** (Section 1 + Section 2 complete)
5. **Replaces** the original half-done PDF in Supabase bucket

### **What Gets Tracked:**
- Which fields were edited
- Old values vs new values
- Timestamp of each edit
- Manager who made the edit
- IP address, user agent

---

## 📊 **Complete Flow**

### **Step 1: Employee Completes Onboarding**

```
Employee fills Section 1 → Signs → Uploads docs
         ↓
Backend generates PDF:
  - Section 1: ✅ Filled
  - Section 2: ❌ Empty
         ↓
Saved to Supabase Storage:
  Path: hilton_downtown/goutam_vemula/forms/i9/i9_form_signed_20251003_124004_bf1f1988-a18c-4806-8f30-1118893b6018.pdf
         ↓
Database record:
  signed_documents table:
    - storage_path: "..."
    - section_completed: "section1"
    - status: "pending_manager_review"
```

---

### **Step 2: Manager Opens Review**

```
Manager clicks "Start Review"
         ↓
Backend API: GET /api/manager/review/employees/{employee_id}/documents/i9
         ↓
Returns:
  {
    "section1Data": {...},
    "uploadedDocuments": [...],
    "employerProfile": {...},
    "existingPdfUrl": "https://supabase.../i9_form_signed_20251003_124004_bf1f1988-a18c-4806-8f30-1118893b6018.pdf",
    "ocrData": {
      "drivers_license": {
        "document_number": "123456789",
        "issuing_authority": "TENNESSEE",
        "expiration_date": "06/01/2032"
      },
      "ssn_card": {
        "ssn": "909-09-0909"
      }
    }
  }
         ↓
Frontend displays 3-column layout:
  - Left: Section 1 data (read-only)
  - Middle: Uploaded document images
  - Right: PDF editor with Section 2 fields
```

---

### **Step 3: Manager Edits PDF**

```
Manager sees Section 2 form with auto-filled fields:
         ↓
┌─────────────────────────────────────────────┐
│ Section 2: Employer Verification            │
├─────────────────────────────────────────────┤
│ Document 1:                                 │
│ Title: [Driver's License        ] ✓ OCR     │
│ Authority: [TENNESSEE           ] ✓ OCR     │
│ Number: [123456789              ] ✓ OCR     │
│ Exp: [06/01/2032                ] ✓ OCR     │
│                                             │
│ Document 2:                                 │
│ Title: [Social Security Card    ] ✓ OCR     │
│ Authority: [SSA                 ] ✓ OCR     │
│ Number: [909-09-0909            ] ✓ OCR     │
│ Exp: [N/A                       ]           │
│                                             │
│ First Day of Employment:                    │
│ [10/15/2025                     ] ✓ Auto    │
│                                             │
│ Employer Information:                       │
│ Name: [John Smith               ] ✓ Profile │
│ Title: [General Manager         ] ✓ Profile │
│ Business: [Hilton Downtown      ] ✓ Profile │
│ Address: [123 Main St           ] ✓ Profile │
│ City: [Los Angeles] State: [CA] ZIP: [90001]│
│                                             │
│ Signature: [Click to Sign]                  │
└─────────────────────────────────────────────┘
         ↓
Manager edits a field (e.g., corrects DL number):
  Old: "123456789"
  New: "123456790"
         ↓
Frontend tracks change:
  {
    "field": "document1.documentNumber",
    "oldValue": "123456789",
    "newValue": "123456790",
    "editedAt": "2025-10-05T14:30:00Z",
    "source": "manual_correction"
  }
```

---

### **Step 4: Manager Signs PDF**

```
Manager clicks "Sign"
         ↓
Signature pad modal opens
         ↓
Manager signs
         ↓
Signature captured:
  {
    "dataUrl": "data:image/png;base64...",
    "timestamp": "2025-10-05T14:35:00Z",
    "ipAddress": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  }
```

---

### **Step 5: Generate Final PDF**

```
Manager clicks "Complete & Sign I-9 Section 2"
         ↓
Frontend sends to backend:
  POST /api/manager/review/employees/{employee_id}/documents/i9/complete
  
  Body:
  {
    "section2Data": {
      "document1": {
        "title": "Driver's License",
        "issuingAuthority": "TENNESSEE",
        "documentNumber": "123456790",  // ← Edited
        "expirationDate": "06/01/2032"
      },
      "document2": {
        "title": "Social Security Card",
        "issuingAuthority": "Social Security Administration",
        "documentNumber": "909-09-0909",
        "expirationDate": "N/A"
      },
      "firstDayOfEmployment": "10/15/2025",
      "employerName": "John Smith",
      "employerTitle": "General Manager",
      "businessName": "Hilton Downtown Los Angeles",
      "businessAddress": "123 Main Street",
      "city": "Los Angeles",
      "state": "CA",
      "zipCode": "90001",
      "signature": {...},
      "signatureDate": "10/05/2025"
    },
    "editedFields": [
      {
        "field": "document1.documentNumber",
        "oldValue": "123456789",
        "newValue": "123456790",
        "editedAt": "2025-10-05T14:30:00Z",
        "source": "manual_correction"
      }
    ],
    "updateEmployerProfile": true
  }
         ↓
Backend:
  1. Load existing PDF from Supabase
  2. Fill Section 2 fields with manager's data
  3. Add manager's signature
  4. Generate new PDF bytes
  5. Upload to Supabase (REPLACE old PDF)
  6. Save edit history to database
  7. Update employee status
```

---

## 🔧 **Backend Implementation**

### **POST /api/manager/review/employees/{employee_id}/documents/i9/complete**

```python
from pypdf import PdfReader, PdfWriter
from pdf_lib import fill_pdf_fields, add_signature_to_pdf

@app.post("/api/manager/review/employees/{employee_id}/documents/i9/complete")
async def complete_i9_section2(
    employee_id: str,
    data: I9Section2CompletionRequest,
    current_user = Depends(get_current_manager)
):
    # 1. Get existing PDF from Supabase
    employee = get_employee(employee_id)
    existing_pdf_record = supabase.table('signed_documents')\
        .select('*')\
        .eq('employee_id', employee_id)\
        .eq('form_type', 'i9')\
        .order('created_at', desc=True)\
        .limit(1)\
        .single()\
        .execute()
    
    # Download existing PDF
    existing_pdf_bytes = supabase.storage.from_('onboarding-documents')\
        .download(existing_pdf_record.data['storage_path'])
    
    # 2. Load PDF and fill Section 2 fields
    pdf_reader = PdfReader(io.BytesIO(existing_pdf_bytes))
    pdf_writer = PdfWriter()
    
    # Copy all pages
    for page in pdf_reader.pages:
        pdf_writer.add_page(page)
    
    # Fill Section 2 fields
    section2_fields = {
        # Document 1
        "List B Document 1 Title": data.section2Data.document1.title,
        "List B Issuing Authority 1": data.section2Data.document1.issuingAuthority,
        "List B Document Number 1": data.section2Data.document1.documentNumber,
        "List B Expiration Date 1": data.section2Data.document1.expirationDate,
        
        # Document 2 (if exists)
        "List C Document Title 1": data.section2Data.document2.title if data.section2Data.document2 else "",
        "List C Issuing Authority 1": data.section2Data.document2.issuingAuthority if data.section2Data.document2 else "",
        "List C Document Number 1": data.section2Data.document2.documentNumber if data.section2Data.document2 else "",
        "List C Expiration Date 1": data.section2Data.document2.expirationDate if data.section2Data.document2 else "",
        
        # Employment info
        "FirstDayEmployed mmddyyyy": data.section2Data.firstDayOfEmployment,
        
        # Employer info
        "Last Name First Name and Title of Employer or Authorized Representative": f"{data.section2Data.employerName}, {data.section2Data.employerTitle}",
        "Employers Business or Org Name": data.section2Data.businessName,
        "Employers Business or Org Address": f"{data.section2Data.businessAddress}, {data.section2Data.city}, {data.section2Data.state} {data.section2Data.zipCode}",
        "S2 Todays Date mmddyyyy": data.section2Data.signatureDate
    }
    
    # Update PDF form fields
    pdf_writer.update_page_form_field_values(
        pdf_writer.pages[0],
        section2_fields
    )
    
    # 3. Add manager signature to PDF
    signature_image = base64.b64decode(data.section2Data.signature.dataUrl.split(',')[1])
    add_signature_to_pdf(
        pdf_writer,
        page_num=0,
        signature_image=signature_image,
        x=400,  # Signature position for Section 2
        y=150,
        width=150,
        height=40
    )
    
    # 4. Generate final PDF bytes
    output_buffer = io.BytesIO()
    pdf_writer.write(output_buffer)
    final_pdf_bytes = output_buffer.getvalue()
    
    # 5. Upload to Supabase (REPLACE old PDF)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    uuid_str = str(uuid.uuid4())
    new_filename = f"i9_form_signed_{timestamp}_{uuid_str}.pdf"
    
    property_name = employee.property.name.replace(' ', '_')
    employee_name = f"{employee.first_name}_{employee.last_name}".replace(' ', '_')
    storage_path = f"{property_name}/{employee_name}/forms/i9/{new_filename}"
    
    # Upload new PDF
    supabase.storage.from_('onboarding-documents').upload(
        storage_path,
        final_pdf_bytes,
        file_options={"content-type": "application/pdf"}
    )
    
    # Delete old PDF
    supabase.storage.from_('onboarding-documents').remove([
        existing_pdf_record.data['storage_path']
    ])
    
    # 6. Save Section 2 data to database
    supabase.table('i9_forms').insert({
        "employee_id": employee_id,
        "section": "section2",
        "form_data": data.section2Data.dict(),
        "signed": True,
        "signature_data": data.section2Data.signature.dict(),
        "completed_at": datetime.now().isoformat(),
        "completed_by": current_user.id
    }).execute()
    
    # 7. Save edit history
    if data.editedFields:
        for edit in data.editedFields:
            supabase.table('manager_review_actions').insert({
                "employee_id": employee_id,
                "manager_id": current_user.id,
                "action_type": "field_edited",
                "document_type": "i9",
                "field_name": edit.field,
                "old_value": edit.oldValue,
                "new_value": edit.newValue,
                "edited_at": edit.editedAt,
                "metadata": {
                    "source": edit.source,
                    "ip_address": request.client.host,
                    "user_agent": request.headers.get("user-agent")
                }
            }).execute()
    
    # 8. Update signed_documents table
    supabase.table('signed_documents').update({
        "storage_path": storage_path,
        "section_completed": "section1_and_section2",
        "status": "completed",
        "signed_by": "manager",
        "manager_id": current_user.id,
        "manager_signed_at": datetime.now().isoformat()
    }).eq('id', existing_pdf_record.data['id']).execute()
    
    # 9. Update employee status
    supabase.table('employees').update({
        "i9_section2_status": "completed",
        "i9_section2_completed_at": datetime.now().isoformat(),
        "i9_section2_completed_by": current_user.id,
        "manager_review_status": "approved"
    }).eq('id', employee_id).execute()
    
    # 10. Update/Create employer profile if requested
    if data.updateEmployerProfile:
        existing_profile = supabase.table('employer_profiles')\
            .select('*')\
            .eq('property_id', employee.property_id)\
            .eq('is_active', True)\
            .execute()
        
        profile_data = {
            "property_id": employee.property_id,
            "i9_employer_name": data.section2Data.employerName,
            "i9_employer_title": data.section2Data.employerTitle,
            "i9_business_name": data.section2Data.businessName,
            "i9_business_address": data.section2Data.businessAddress,
            "city": data.section2Data.city,
            "state": data.section2Data.state,
            "zip_code": data.section2Data.zipCode,
            "is_active": True
        }
        
        if existing_profile.data:
            supabase.table('employer_profiles').update(profile_data)\
                .eq('id', existing_profile.data[0]['id']).execute()
        else:
            supabase.table('employer_profiles').insert(profile_data).execute()
    
    # 11. Get signed URL for final PDF
    final_pdf_url = supabase.storage.from_('onboarding-documents')\
        .create_signed_url(storage_path, 3600)['signedURL']
    
    return {
        "success": True,
        "finalPdfUrl": final_pdf_url,
        "nextDocument": "w4",
        "message": "I-9 Section 2 completed successfully"
    }
```

---

## 📊 **Database Schema for Tracking Edits**

### **manager_review_actions Table**

```sql
CREATE TABLE manager_review_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    manager_id UUID REFERENCES users(id),
    action_type VARCHAR(50), -- 'field_edited', 'approved', 'rejected', 'viewed'
    document_type VARCHAR(100), -- 'i9', 'w4', 'direct_deposit', etc.
    field_name VARCHAR(255), -- 'document1.documentNumber', 'employerName', etc.
    old_value TEXT,
    new_value TEXT,
    edited_at TIMESTAMP,
    metadata JSONB, -- IP, user agent, source (ocr_correction, manual_entry, etc.)
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_manager_review_actions_employee ON manager_review_actions(employee_id);
CREATE INDEX idx_manager_review_actions_manager ON manager_review_actions(manager_id);
```

---

## 🎨 **Frontend: Track Edits**

```typescript
const I9Section2Form = ({ ... }) => {
  const [formData, setFormData] = useState({...});
  const [editedFields, setEditedFields] = useState<EditHistory[]>([]);
  
  const handleFieldChange = (field: string, newValue: string) => {
    const oldValue = getFieldValue(formData, field);
    
    // Track the edit
    if (oldValue !== newValue) {
      setEditedFields(prev => [
        ...prev,
        {
          field,
          oldValue,
          newValue,
          editedAt: new Date().toISOString(),
          source: isAutoFilled(field) ? 'ocr_correction' : 'manual_entry'
        }
      ]);
    }
    
    // Update form data
    setFormData(prev => setFieldValue(prev, field, newValue));
  };
  
  const handleSubmit = async () => {
    const response = await api.post(
      `/manager/review/employees/${employeeId}/documents/i9/complete`,
      {
        section2Data: formData,
        editedFields,
        updateEmployerProfile: true
      }
    );
    
    // Show success message
    alert('I-9 Section 2 completed successfully!');
    
    // Navigate to next document
    navigate(`/manager/review/${employeeId}/w4`);
  };
};
```

---

## ✅ **Summary**

### **What Happens:**
1. ✅ Manager opens existing I-9 PDF (Section 1 filled)
2. ✅ Manager sees auto-filled Section 2 fields (from OCR + employer profile)
3. ✅ Manager edits any incorrect fields
4. ✅ All edits are tracked (old value → new value)
5. ✅ Manager signs the PDF
6. ✅ Backend generates final PDF (Section 1 + Section 2)
7. ✅ **Final PDF replaces the original PDF** in Supabase bucket
8. ✅ Edit history saved to database
9. ✅ Employee status updated to "completed"

### **Key Points:**
- ✅ PDF is edited, not just form filled
- ✅ Final PDF replaces original PDF (same bucket, new filename)
- ✅ All changes tracked in `manager_review_actions` table
- ✅ Audit trail for compliance

Is this the correct flow now?

