# I-9 Manager Review - FINAL PLAN

## 🎯 **What Manager Gets:**

90% of the time, manager receives:
- **PDF**: `i9_form_signed_20251003_124004_bf1f1988-a18c-4806-8f30-1118893b6018.pdf`
  - Section 1: ✅ FILLED (employee data)
  - List A/B/C: ✅ FILLED (DL#, SSN, etc. - already in PDF)
  - Section 2 Employer: ❌ EMPTY (manager needs to fill)

- **Database**: List A/B/C data already saved in `i9_section2_documents` table
- **Images**: Uploaded DL, SSN card images for verification

---

## 📊 **Manager Review Flow:**

```
Manager Opens Review
         ↓
Backend Loads:
  1. Existing PDF (Section 1 + List A/B/C already filled)
  2. Uploaded images (DL, SSN card)
  3. Employer profile (if exists)
         ↓
Frontend Displays:
  - Left: PDF viewer (Section 1 + List A/B/C visible)
  - Middle: Uploaded images
  - Right: Section 2 Employer form (to fill)
         ↓
Check: Employer Profile Exists?
  ├─ YES → Auto-fill employer fields
  └─ NO  → Show modal → Save to DB → Auto-fill
         ↓
Manager:
  1. Verifies Section 1 data (left)
  2. Verifies List A/B/C data matches images (middle)
  3. Fills/verifies employer fields (right)
  4. Signs
         ↓
Backend:
  1. Takes existing PDF
  2. Fills Section 2 employer fields
  3. Adds manager signature
  4. Generates final PDF
  5. REPLACES old PDF in Supabase bucket
         ↓
Done! ✅
```

---

## 🔧 **Backend API:**

```python
@app.get("/api/manager/review/employees/{employee_id}/documents/i9")
async def get_i9_for_review(employee_id: str):
    employee = get_employee(employee_id)
    
    # 1. Get existing PDF URL
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
    employer_profile = supabase.table('employer_profiles')\
        .select('*')\
        .eq('property_id', employee.property_id)\
        .eq('is_active', True)\
        .single()\
        .execute()
    
    return {
        "pdfUrl": pdf_url,
        "uploadedImages": images.data,
        "employerProfile": employer_profile.data if employer_profile.data else None,
        "employeeStartDate": employee.start_date,
        "i9Deadline": employee.i9_section2_deadline
    }
```

```python
@app.post("/api/manager/review/employees/{employee_id}/documents/i9/complete")
async def complete_i9_section2(
    employee_id: str,
    data: I9Section2CompletionRequest,
    current_user = Depends(get_current_manager)
):
    employee = get_employee(employee_id)
    
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
    
    # 2. Fill Section 2 employer fields in PDF
    from pypdf import PdfReader, PdfWriter
    
    pdf_reader = PdfReader(io.BytesIO(existing_pdf_bytes))
    pdf_writer = PdfWriter()
    
    for page in pdf_reader.pages:
        pdf_writer.add_page(page)
    
    # Fill employer fields
    employer_fields = {
        "FirstDayEmployed mmddyyyy": data.firstDayOfEmployment,
        "Last Name First Name and Title of Employer or Authorized Representative": f"{data.employerName}, {data.employerTitle}",
        "Employers Business or Org Name": data.businessName,
        "Employers Business or Org Address": f"{data.businessAddress}, {data.city}, {data.state} {data.zipCode}",
        "S2 Todays Date mmddyyyy": data.signatureDate
    }
    
    pdf_writer.update_page_form_field_values(pdf_writer.pages[0], employer_fields)
    
    # 3. Add manager signature
    signature_image = base64.b64decode(data.signature.dataUrl.split(',')[1])
    add_signature_to_pdf(pdf_writer, 0, signature_image, x=400, y=150, width=150, height=40)
    
    # 4. Generate final PDF
    output = io.BytesIO()
    pdf_writer.write(output)
    final_pdf_bytes = output.getvalue()
    
    # 5. Upload new PDF
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    uuid_str = str(uuid.uuid4())
    new_filename = f"i9_form_signed_{timestamp}_{uuid_str}.pdf"
    
    property_name = employee.property.name.replace(' ', '_')
    employee_name = f"{employee.first_name}_{employee.last_name}".replace(' ', '_')
    new_path = f"{property_name}/{employee_name}/forms/i9/{new_filename}"
    
    supabase.storage.from_('onboarding-documents').upload(
        new_path,
        final_pdf_bytes,
        file_options={"content-type": "application/pdf"}
    )
    
    # 6. Delete old PDF
    supabase.storage.from_('onboarding-documents').remove([pdf_record.data['storage_path']])
    
    # 7. Update database
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
    
    # 8. Save/Update employer profile
    if data.updateEmployerProfile:
        existing = supabase.table('employer_profiles')\
            .select('*')\
            .eq('property_id', employee.property_id)\
            .execute()
        
        profile_data = {
            "property_id": employee.property_id,
            "i9_employer_name": data.employerName,
            "i9_employer_title": data.employerTitle,
            "i9_business_name": data.businessName,
            "i9_business_address": data.businessAddress,
            "city": data.city,
            "state": data.state,
            "zip_code": data.zipCode,
            "is_active": True
        }
        
        if existing.data:
            supabase.table('employer_profiles').update(profile_data)\
                .eq('id', existing.data[0]['id']).execute()
        else:
            supabase.table('employer_profiles').insert(profile_data).execute()
    
    return {
        "success": True,
        "finalPdfUrl": supabase.storage.from_('onboarding-documents')\
            .create_signed_url(new_path, 3600)['signedURL'],
        "nextDocument": "w4"
    }
```

---

## 🎨 **Frontend Components:**

### **Main Container:**
```typescript
const I9ReviewModal = ({ employeeId }) => {
  const [data, setData] = useState(null);
  const [showEmployerModal, setShowEmployerModal] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    const response = await api.get(`/manager/review/employees/${employeeId}/documents/i9`);
    setData(response.data);
    
    if (!response.data.employerProfile) {
      setShowEmployerModal(true);
    }
  };
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Left: PDF Viewer */}
      <PDFViewer pdfUrl={data.pdfUrl} />
      
      {/* Middle: Uploaded Images */}
      <ImageViewer images={data.uploadedImages} />
      
      {/* Right: Employer Form */}
      <EmployerForm
        employerProfile={data.employerProfile}
        employeeStartDate={data.employeeStartDate}
        onComplete={handleComplete}
      />
      
      {/* Employer Setup Modal */}
      {showEmployerModal && (
        <EmployerSetupModal onSave={handleEmployerSave} />
      )}
    </div>
  );
};
```

---

## ✅ **Summary:**

1. **Load**: Existing PDF + Images + Employer profile (if exists)
2. **Display**: PDF (left) + Images (middle) + Employer form (right)
3. **Auto-fill**: Employer fields (if profile exists) OR show modal (first time)
4. **Manager**: Verifies + Signs
5. **Save**: Final PDF REPLACES old PDF in bucket

**That's it!** Simple and clean.

