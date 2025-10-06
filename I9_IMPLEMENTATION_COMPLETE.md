# I-9 Manager Review - Implementation Complete

## ✅ **What's Built:**

### **Frontend Components:**

1. **`I9ReviewModal.tsx`** - Main container
   - 3-column layout
   - Loads PDF, images, employer profile
   - Shows employer setup modal if no profile exists
   - Handles completion and submission

2. **`PDFViewer.tsx`** - Left column
   - Displays existing I-9 PDF (Section 1 + List A/B/C already filled)
   - Zoom controls
   - Download button
   - Full-screen view

3. **`ImageViewer.tsx`** - Middle column
   - Shows uploaded verification documents (DL, SSN card)
   - Click to view full-size
   - Zoom controls in modal

4. **`EmployerForm.tsx`** - Right column
   - Auto-fills employer fields if profile exists
   - Auto-fills employment date from employee.start_date
   - Digital signature pad
   - Submit button

5. **`EmployerSetupModal.tsx`** - First-time setup
   - Pops up if no employer profile exists
   - Collects employer information
   - Saves to database for future use

6. **`SignaturePadModal.tsx`** - Signature capture (already exists)
   - Canvas-based signature
   - Captures timestamp, IP, user agent

7. **`i9ManagerReview.ts`** - TypeScript types (already exists)
   - All interfaces and types

---

## 📊 **The Flow:**

```
Manager clicks "Start Review"
         ↓
I9ReviewModal loads:
  - GET /api/manager/review/employees/{id}/documents/i9
         ↓
Returns:
  - pdfUrl (existing PDF with Section 1 + List A/B/C filled)
  - uploadedImages (DL, SSN card)
  - employerProfile (if exists) or null
  - employeeStartDate
         ↓
Display 3 columns:
  ┌──────────────┬──────────────┬──────────────┐
  │ PDFViewer    │ ImageViewer  │ EmployerForm │
  │ (Section 1   │ (DL, SSN)    │ (Section 2)  │
  │  + List A/B/C│              │              │
  │  visible)    │              │              │
  └──────────────┴──────────────┴──────────────┘
         ↓
Check: employerProfile exists?
  ├─ YES → Auto-fill employer fields
  └─ NO  → Show EmployerSetupModal
         ↓
Manager:
  1. Verifies Section 1 data (left)
  2. Verifies List A/B/C matches images (middle)
  3. Reviews/edits employer fields (right)
  4. Signs
         ↓
Click "Complete & Sign I-9 Section 2"
         ↓
POST /api/manager/review/employees/{id}/documents/i9/complete
  Body: {
    firstDayOfEmployment,
    employerName,
    employerTitle,
    businessName,
    businessAddress,
    city,
    state,
    zipCode,
    signature,
    signatureDate,
    updateEmployerProfile: true/false
  }
         ↓
Backend:
  1. Load existing PDF
  2. Fill Section 2 employer fields
  3. Add manager signature
  4. Generate final PDF
  5. REPLACE old PDF in Supabase bucket
  6. Update database
  7. Save/update employer profile
         ↓
Done! ✅
```

---

## 🔧 **Backend API Needed:**

### **1. GET /api/manager/review/employees/{employee_id}/documents/i9**

```python
@app.get("/api/manager/review/employees/{employee_id}/documents/i9")
async def get_i9_for_review(employee_id: str):
    # 1. Get existing PDF
    pdf_record = supabase.table('signed_documents')\
        .select('*')\
        .eq('employee_id', employee_id)\
        .eq('form_type', 'i9')\
        .order('created_at', desc=True)\
        .limit(1)\
        .single()\
        .execute()
    
    pdf_url = supabase.storage.from_('onboarding-documents')\
        .create_signed_url(pdf_record.data['storage_path'], 3600)['signedURL']
    
    # 2. Get uploaded images
    images = supabase.table('i9_section2_documents')\
        .select('*')\
        .eq('employee_id', employee_id)\
        .execute()
    
    for img in images.data:
        img['url'] = supabase.storage.from_('onboarding-documents')\
            .create_signed_url(img['storage_path'], 3600)['signedURL']
    
    # 3. Get employer profile
    employee = get_employee(employee_id)
    employer_profile = supabase.table('employer_profiles')\
        .select('*')\
        .eq('property_id', employee.property_id)\
        .eq('is_active', True)\
        .single()\
        .execute()
    
    # 4. Get employee info
    return {
        "pdfUrl": pdf_url,
        "uploadedImages": images.data,
        "employerProfile": employer_profile.data if employer_profile.data else None,
        "employeeStartDate": employee.start_date,
        "i9Deadline": employee.i9_section2_deadline,
        "employeeName": f"{employee.first_name} {employee.last_name}"
    }
```

### **2. POST /api/manager/review/employees/{employee_id}/documents/i9/complete**

```python
@app.post("/api/manager/review/employees/{employee_id}/documents/i9/complete")
async def complete_i9_section2(employee_id: str, data: dict):
    # 1. Get existing PDF
    pdf_record = supabase.table('signed_documents')\
        .select('*')\
        .eq('employee_id', employee_id)\
        .eq('form_type', 'i9')\
        .order('created_at', desc=True)\
        .limit(1)\
        .single()\
        .execute()
    
    existing_pdf_bytes = supabase.storage.from_('onboarding-documents')\
        .download(pdf_record.data['storage_path'])
    
    # 2. Fill Section 2 fields in PDF
    from pypdf import PdfReader, PdfWriter
    
    pdf_reader = PdfReader(io.BytesIO(existing_pdf_bytes))
    pdf_writer = PdfWriter()
    
    for page in pdf_reader.pages:
        pdf_writer.add_page(page)
    
    # Fill employer fields
    employer_fields = {
        "FirstDayEmployed mmddyyyy": data['firstDayOfEmployment'],
        "Last Name First Name and Title of Employer or Authorized Representative": 
            f"{data['employerName']}, {data['employerTitle']}",
        "Employers Business or Org Name": data['businessName'],
        "Employers Business or Org Address": 
            f"{data['businessAddress']}, {data['city']}, {data['state']} {data['zipCode']}",
        "S2 Todays Date mmddyyyy": data['signatureDate']
    }
    
    pdf_writer.update_page_form_field_values(pdf_writer.pages[0], employer_fields)
    
    # 3. Add manager signature
    signature_image = base64.b64decode(data['signature']['dataUrl'].split(',')[1])
    add_signature_to_pdf(pdf_writer, 0, signature_image, x=400, y=150, width=150, height=40)
    
    # 4. Generate final PDF
    output = io.BytesIO()
    pdf_writer.write(output)
    final_pdf_bytes = output.getvalue()
    
    # 5. Upload new PDF and delete old one
    employee = get_employee(employee_id)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    uuid_str = str(uuid.uuid4())
    new_filename = f"i9_form_signed_{timestamp}_{uuid_str}.pdf"
    
    property_name = employee.property.name.replace(' ', '_')
    employee_name = f"{employee.first_name}_{employee.last_name}".replace(' ', '_')
    new_path = f"{property_name}/{employee_name}/forms/i9/{new_filename}"
    
    supabase.storage.from_('onboarding-documents').upload(
        new_path, final_pdf_bytes, file_options={"content-type": "application/pdf"}
    )
    
    supabase.storage.from_('onboarding-documents').remove([pdf_record.data['storage_path']])
    
    # 6. Update database
    supabase.table('signed_documents').update({
        "storage_path": new_path,
        "section_completed": "section1_and_section2",
        "status": "completed",
        "manager_id": current_user.id,
        "manager_signed_at": datetime.now().isoformat()
    }).eq('id', pdf_record.data['id']).execute()
    
    supabase.table('employees').update({
        "i9_section2_status": "completed",
        "manager_review_status": "approved"
    }).eq('id', employee_id).execute()
    
    # 7. Save/update employer profile
    if data.get('updateEmployerProfile'):
        existing = supabase.table('employer_profiles')\
            .select('*').eq('property_id', employee.property_id).execute()
        
        profile_data = {
            "property_id": employee.property_id,
            "i9_employer_name": data['employerName'],
            "i9_employer_title": data['employerTitle'],
            "i9_business_name": data['businessName'],
            "i9_business_address": data['businessAddress'],
            "city": data['city'],
            "state": data['state'],
            "zip_code": data['zipCode'],
            "is_active": True
        }
        
        if existing.data:
            supabase.table('employer_profiles').update(profile_data)\
                .eq('id', existing.data[0]['id']).execute()
        else:
            supabase.table('employer_profiles').insert(profile_data).execute()
    
    return {"success": True, "nextDocument": "w4"}
```

---

## ✅ **Summary:**

### **Frontend Complete:**
- ✅ I9ReviewModal (main container)
- ✅ PDFViewer (shows existing PDF)
- ✅ ImageViewer (shows uploaded docs)
- ✅ EmployerForm (Section 2 form)
- ✅ EmployerSetupModal (first-time setup)
- ✅ SignaturePadModal (already exists)
- ✅ TypeScript types (already exists)

### **Backend Needed:**
- ❌ GET /api/manager/review/employees/{id}/documents/i9
- ❌ POST /api/manager/review/employees/{id}/documents/i9/complete
- ❌ PDF manipulation (pypdf library)
- ❌ Signature addition to PDF

### **Next Steps:**
1. Implement backend API endpoints
2. Test the complete flow
3. Handle edge cases (missing data, errors)
4. Add loading states and error handling
5. Test PDF generation and replacement

**Ready to implement the backend!**

