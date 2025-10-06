# Complete Review Implementation - Detailed Plan

## 🎯 **Goal**
Implement the complete review endpoint that:
1. Verifies all documents are approved
2. Updates employee status to "active"
3. Sends beautiful welcome email to employee
4. Makes documents accessible in employee section

---

## 📊 **Current State Analysis Needed**

### **Questions to Answer:**
1. What is the current bucket structure for completed documents?
2. Where are the signed/completed PDFs stored?
3. What naming convention is used for completed documents?
4. Are there separate folders for each document type?
5. How are supporting documents (I-9 verification, voided checks) organized?

### **Need to Check:**
- `onboarding-documents/m6/ethan_thomas/` structure
- Document naming patterns
- Folder organization
- Completed vs. in-progress documents

---

## 🏗️ **Implementation Architecture**

### **Phase 1: Backend - Complete Review Endpoint**

**Endpoint:** `POST /api/manager/review/employees/{employee_id}/complete-review`

**Request Model:**
```python
class CompleteReviewRequest(BaseModel):
    startDate: str  # ISO format: "2025-10-07"
    startTime: str  # "9:00 AM"
    employeeNumber: str  # "EMP-2025-001"
    dressCode: str = "Business casual"
    parkingDetails: str = "Employee parking available on-site"
    notes: Optional[str] = None
```

**Process Flow:**
```
1. Verify manager has access to employee
2. Check all required documents are approved
   - Query document_approvals table
   - Ensure all 5 documents have status='approved'
3. Get employee data
   - Employee info (name, email, position, department)
   - Property info (name, address)
   - Manager info (name, email, phone)
4. Update employee record
   - manager_review_status = "completed"
   - manager_review_completed_at = now()
   - employment_status = "active"
   - onboarding_status = "completed"
   - employee_number = request.employeeNumber
   - start_date = request.startDate (if different)
5. Send completion email
   - Beautiful HTML email
   - All employment details
   - First day information
   - Manager contact info
   - CC to manager
6. Create completion milestone/log
7. Return success response
```

**Response:**
```json
{
  "success": true,
  "message": "Employee activated successfully",
  "employee": {
    "id": "...",
    "employeeNumber": "EMP-2025-001",
    "status": "active",
    "startDate": "2025-10-07",
    "emailSent": true
  }
}
```

---

### **Phase 2: Email Service - Onboarding Completion Email**

**Method:** `send_onboarding_completion_email()`

**Required Data:**
```python
{
    # Employee Info
    "employee_email": "benjamin.thomas@email.com",
    "employee_name": "Benjamin Thomas",
    "employee_number": "EMP-2025-001",
    "position": "Housekeeping",
    "department": "Front Office",
    
    # Start Info
    "start_date": "Monday, October 7, 2025",
    "start_time": "9:00 AM",
    
    # Property Info
    "property_name": "m6",
    "property_address": "403 - 126 Corbin Avenue, Jersey City, NJ 07306",
    
    # Manager Info
    "manager_name": "Goutham Vemula",
    "manager_email": "goutham.vemula@hotel.com",
    "manager_phone": "(555) 123-4567",
    
    # Additional Info
    "dress_code": "Business casual",
    "parking_details": "Employee parking available on-site",
    
    # Options
    "cc_manager": true
}
```

**Email Template Structure:**
1. **Header:** Gradient with celebration emoji
2. **Greeting:** Personalized with employee name
3. **Employment Details Box:** Position, department, employee #, start date/time, location
4. **What's Next:** Checklist of completed items
5. **First Day Information Box:** Date, time, location, who to report to, what to bring, what to expect
6. **Manager Contact Box:** Name, email, phone
7. **Important Reminders Box:** Arrive early, dress code, parking
8. **Closing:** Welcome message
9. **Footer:** Automated message with employee ID

**Email Features:**
- HTML + Plain text versions
- Mobile responsive
- Professional design
- Clear call-to-action
- All necessary information

---

### **Phase 3: Database Updates**

**Tables to Update:**

1. **employees table:**
```sql
UPDATE employees SET
  manager_review_status = 'completed',
  manager_review_completed_at = NOW(),
  employment_status = 'active',
  onboarding_status = 'completed',
  employee_number = 'EMP-2025-001',
  start_date = '2025-10-07'  -- if changed
WHERE id = 'employee_id';
```

2. **Optional: Create completion log:**
```sql
INSERT INTO employee_milestones (
  employee_id,
  milestone_type,
  milestone_date,
  notes,
  created_by
) VALUES (
  'employee_id',
  'onboarding_completed',
  NOW(),
  'All documents approved and employee activated',
  'manager_id'
);
```

---

### **Phase 4: Document Access**

**After activation, documents should be accessible via:**

**Endpoint:** `GET /api/manager/employees/{employee_id}/documents`

**Document Locations (Need to Verify):**
```
onboarding-documents/
  m6/
    ethan_thomas/
      forms/
        company_policies/
          company_policies_signed_TIMESTAMP_ID.pdf
        i9/
          i9_signed_TIMESTAMP_ID.pdf
          verification_documents/
            passport_front.jpg
            passport_back.jpg
        w4/
          w4_signed_TIMESTAMP_ID.pdf
          w4_completed_TIMESTAMP_ID.pdf  (with employer section)
        direct_deposit/
          direct_deposit_signed_TIMESTAMP_ID.pdf
          supporting_documents/
            voided_check.pdf
        health_insurance/
          health_insurance_signed_TIMESTAMP_ID.pdf
          health_insurance_completed_TIMESTAMP_ID.pdf  (with employer section)
```

**Response Structure:**
```json
{
  "employee": {
    "id": "...",
    "name": "Ethan Thomas",
    "employeeNumber": "EMP-2025-001",
    "position": "Housekeeping",
    "department": "Front Office"
  },
  "documents": [
    {
      "type": "company_policies",
      "name": "Company Policies",
      "status": "approved",
      "approvedAt": "2025-10-05T18:45:39.957Z",
      "approvedBy": "Goutham Vemula",
      "pdfUrl": "https://...",
      "canView": true,
      "canDownload": true
    },
    {
      "type": "i9",
      "name": "I-9 Employment Eligibility",
      "status": "approved",
      "approvedAt": "2025-10-05T18:46:20.816Z",
      "approvedBy": "Goutham Vemula",
      "pdfUrl": "https://...",
      "verificationDocuments": [
        {
          "type": "passport",
          "url": "https://..."
        }
      ],
      "canView": true,
      "canDownload": true
    }
    // ... more documents
  ]
}
```

---

## 🔍 **What I Need to Check**

### **1. Bucket Structure:**
- How are completed documents organized?
- Are there separate "completed" versions vs "signed" versions?
- Where are supporting documents stored?

### **2. Document Naming:**
- What naming pattern is used?
- How to identify the latest/final version?
- How to distinguish employee-signed vs manager-completed?

### **3. Document Approvals:**
- What data is stored in document_approvals table?
- Is there a reference to the final PDF URL?
- How to retrieve the approved document?

### **4. Employee Data:**
- What fields exist in employees table?
- Is there a manager_phone field?
- Where is property address stored?

---

## 📝 **Implementation Steps**

### **Step 1: Investigate Current Structure**
```bash
# Check bucket structure
supabase storage ls onboarding-documents/m6/ethan_thomas

# Check document_approvals table
SELECT * FROM document_approvals WHERE employee_id = 'ethan_thomas_id';

# Check employees table
SELECT * FROM employees WHERE id = 'ethan_thomas_id';

# Check employer_profiles table
SELECT * FROM employer_profiles WHERE property_id = 'm6_property_id';
```

### **Step 2: Implement Backend Endpoint**
1. Create `CompleteReviewRequest` model
2. Implement validation logic
3. Implement email sending
4. Implement database updates
5. Add error handling
6. Add logging

### **Step 3: Implement Email Template**
1. Create HTML template
2. Create plain text template
3. Add dynamic data injection
4. Test email rendering
5. Test email delivery

### **Step 4: Update Frontend**
1. Add service method `completeReview()`
2. Connect modal to backend
3. Handle success/error states
4. Show confirmation message
5. Redirect to employee list

### **Step 5: Testing**
1. Test with real employee data
2. Verify email delivery
3. Verify database updates
4. Verify document access
5. Test error scenarios

---

## ❓ **Questions Before Implementation**

1. **Bucket Structure:** Should I check `onboarding-documents/m6/ethan_thomas/` to see the actual structure?

2. **Email Service:** Do we have an existing email service configured? (SMTP, SendGrid, etc.)

3. **Manager Phone:** Where is manager phone number stored? In users table or employer_profiles?

4. **Property Address:** Is it in employer_profiles table?

5. **Document Versions:** Do we keep both "signed" and "completed" versions, or replace?

6. **Employee Number:** Should it be auto-generated or manager-provided?

---

## 🚀 **Ready to Proceed**

**Next Steps:**
1. ✅ Check bucket structure: `onboarding-documents/m6/ethan_thomas/`
2. ✅ Verify database schema and data
3. ✅ Implement backend endpoint
4. ✅ Implement email template
5. ✅ Connect frontend
6. ✅ Test end-to-end

**Should I proceed to check the bucket structure now?** 📂

