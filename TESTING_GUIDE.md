# 🧪 Testing Guide - Sequential Document Approval

**Quick guide to test the new document approval system**

---

## ✅ **What's Ready to Test**

### **Backend:**
- ✅ Database migration applied
- ✅ Router loaded successfully
- ✅ Endpoints available

### **Endpoints:**
```
GET  /api/manager/review/employees/{id}/documents-status
GET  /api/manager/review/employees/{id}/document/{type}
POST /api/manager/review/employees/{id}/document/{type}/approve
POST /api/manager/review/employees/{id}/document/{type}/reject
```

---

## 🧪 **Test 1: Get Documents Status**

### **Using Browser/Postman:**

```bash
GET http://localhost:8000/api/manager/review/employees/7bda8a8e-b2f6-4052-ad46-6f322836c3e8/documents-status

Headers:
Authorization: Bearer {your_manager_token}
```

### **Expected Response:**

```json
{
  "employeeId": "7bda8a8e-b2f6-4052-ad46-6f322836c3e8",
  "employeeName": "John Doe",
  "propertyName": "m6",
  "documents": [
    {
      "documentType": "company_policies",
      "documentName": "Company Policies Acknowledgment",
      "status": "pending",
      "order": 1,
      "canReview": true
    },
    {
      "documentType": "i9",
      "documentName": "I-9 Employment Eligibility Verification",
      "status": "pending",
      "order": 2,
      "canReview": false  // Locked until company_policies approved
    },
    {
      "documentType": "w4",
      "documentName": "W-4 Federal Tax Withholding",
      "status": "pending",
      "order": 3,
      "canReview": false
    },
    {
      "documentType": "direct_deposit",
      "documentName": "Direct Deposit Authorization",
      "status": "pending",
      "order": 4,
      "canReview": false
    },
    {
      "documentType": "health_insurance",
      "documentName": "Health Insurance Enrollment",
      "status": "pending",
      "order": 5,
      "canReview": false
    }
  ],
  "currentStep": 1,
  "overallStatus": "not_started",
  "completionPercentage": 0
}
```

---

## 🧪 **Test 2: Get Specific Document**

### **Request:**

```bash
GET http://localhost:8000/api/manager/review/employees/7bda8a8e-b2f6-4052-ad46-6f322836c3e8/document/company_policies

Headers:
Authorization: Bearer {your_manager_token}
```

### **Expected Response:**

```json
{
  "pdfUrl": "https://kzommszdhapvqpekpvnt.supabase.co/storage/v1/object/sign/...",
  "documentType": "company_policies",
  "documentName": "Company Policies Acknowledgment"
}
```

---

## 🧪 **Test 3: Approve Document**

### **Request:**

```bash
POST http://localhost:8000/api/manager/review/employees/7bda8a8e-b2f6-4052-ad46-6f322836c3e8/document/company_policies/approve

Headers:
Authorization: Bearer {your_manager_token}
Content-Type: application/json

Body:
{
  "notes": "Signature verified, all pages signed"
}
```

### **Expected Response:**

```json
{
  "success": true,
  "message": "Company Policies Acknowledgment approved successfully",
  "finalPdfUrl": "TODO: Return final PDF URL after regeneration"
}
```

### **Then Check Status Again:**

```bash
GET /api/manager/review/employees/{id}/documents-status
```

**Should show:**
- ✅ company_policies: status = "approved"
- ✅ i9: canReview = true (unlocked!)
- 🔒 w4: canReview = false (still locked)

---

## 🧪 **Test 4: Try to Skip Steps (Should Fail)**

### **Request:**

```bash
POST http://localhost:8000/api/manager/review/employees/7bda8a8e-b2f6-4052-ad46-6f322836c3e8/document/w4/approve

Headers:
Authorization: Bearer {your_manager_token}
Content-Type: application/json

Body:
{
  "notes": "Trying to skip I-9"
}
```

### **Expected Response (400 Error):**

```json
{
  "detail": "Previous document (I-9 Employment Eligibility Verification) must be approved first"
}
```

---

## 🧪 **Test 5: Reject Document**

### **Request:**

```bash
POST http://localhost:8000/api/manager/review/employees/7bda8a8e-b2f6-4052-ad46-6f322836c3e8/document/company_policies/reject

Headers:
Authorization: Bearer {your_manager_token}
Content-Type: application/json

Body:
{
  "reason": "Signature missing on page 3"
}
```

### **Expected Response:**

```json
{
  "success": true,
  "message": "Company Policies Acknowledgment rejected. Employee will be notified to resubmit."
}
```

---

## 🧪 **Test 6: Get I-9 with Uploaded Documents**

### **Request:**

```bash
GET http://localhost:8000/api/manager/review/employees/7bda8a8e-b2f6-4052-ad46-6f322836c3e8/document/i9

Headers:
Authorization: Bearer {your_manager_token}
```

### **Expected Response:**

```json
{
  "pdfUrl": "https://..../i9_signed_xxx.pdf",
  "documentType": "i9",
  "documentName": "I-9 Employment Eligibility Verification",
  "uploadedDocsUrls": [
    {
      "type": "drivers_license",
      "url": "https://..../dl_front.jpg",
      "filename": "dl_front.jpg"
    },
    {
      "type": "passport",
      "url": "https://..../passport.jpg",
      "filename": "passport.jpg"
    },
    {
      "type": "ssn_card",
      "url": "https://..../ssn.jpg",
      "filename": "ssn.jpg"
    }
  ]
}
```

---

## 🧪 **Test 7: Complete Workflow**

### **Step-by-Step:**

```
1. Approve company_policies
   ✅ POST /document/company_policies/approve
   
2. Check status
   ✅ GET /documents-status
   ✅ i9 should be unlocked (canReview: true)
   
3. Approve I-9
   ✅ POST /document/i9/approve
   {
     "form_data": {
       "document_title": "U.S. Passport",
       "document_number": "123456789"
     },
     "signature": "data:image/png;base64,..."
   }
   
4. Check status
   ✅ w4 should be unlocked
   
5. Approve W-4
   ✅ POST /document/w4/approve
   
6. Approve Direct Deposit
   ✅ POST /document/direct_deposit/approve
   
7. Approve Health Insurance
   ✅ POST /document/health_insurance/approve
   
8. Check final status
   ✅ GET /documents-status
   ✅ overallStatus: "complete"
   ✅ completionPercentage: 100
```

---

## 📊 **Check Database**

### **In Supabase SQL Editor:**

```sql
-- Check approval records
SELECT * FROM document_approvals 
WHERE employee_id = '7bda8a8e-b2f6-4052-ad46-6f322836c3e8'
ORDER BY created_at;

-- Should show:
-- document_type | status   | approved_by | approved_at
-- --------------|----------|-------------|------------
-- company_policies | approved | manager-id | timestamp
-- i9            | approved | manager-id | timestamp
-- w4            | approved | manager-id | timestamp
-- ...
```

---

## 🎯 **Success Criteria**

### **✅ All Tests Pass If:**

1. ✅ Can get documents status
2. ✅ Can get specific document PDF
3. ✅ Can approve documents in order
4. ✅ Cannot skip steps (sequential enforcement)
5. ✅ Can reject documents
6. ✅ I-9 returns uploaded verification docs
7. ✅ Completion percentage updates correctly
8. ✅ Database records created correctly

---

## 🚀 **Next Steps After Testing**

1. **Build UI Components:**
   - Document workflow stepper
   - PDF viewer
   - Approve/Reject buttons
   - Progress indicator

2. **Implement PDF Regeneration:**
   - Combine Section 1 + Section 2 for I-9
   - Add manager approval stamps
   - Replace original PDFs in storage

3. **Add Notifications:**
   - Email employee when document rejected
   - Notify when all documents approved

---

**Ready to test! Use Postman or browser console to test these endpoints!** 🧪✅

