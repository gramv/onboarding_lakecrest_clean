# Implementation Plan: Bucket Structure & Complete Review

## 📋 **Overview**

This document outlines the implementation plan for two major features:
1. **Corrected Bucket Structure** - Fix document retrieval to use correct folder paths
2. **Complete Review Implementation** - Implement manager review completion workflow

---

## 🎯 **Phase 1: Corrected Bucket Structure Implementation**

### **Problem Statement**

Current system doesn't properly handle the three-stage I-9 workflow and completed document folders:
- I-9 has 3 stages: `i9_form`, `i9_form_verified`, `i9_form_completed`
- W-4 has 2 stages: `w4_form`, `w4_form_completed`
- Health Insurance has 2 stages: `health_insurance`, `health_insurance_completed`

**We need to always use the `_completed` folders for final documents!**

---

### **Task 1.1: Create Document Retrieval Service**

**File:** `backend/app/services/document_storage_service.py` (NEW)

**Purpose:** Centralized service for retrieving documents from Supabase Storage

**Functions to implement:**

```python
class DocumentStorageService:
    
    def get_latest_document(self, property_name: str, employee_folder: str, doc_type: str) -> Optional[str]:
        """
        Get the latest version of a completed document
        
        Args:
            property_name: e.g., "m6"
            employee_folder: e.g., "christopher_thomas_3"
            doc_type: "company_policies", "i9", "w4", "direct_deposit", "health_insurance"
        
        Returns:
            Signed URL to the latest document PDF (1 hour expiry)
        """
        
    def get_i9_verification_documents(self, property_name: str, employee_folder: str) -> List[Dict]:
        """
        Get all I-9 verification documents (uploaded images)
        
        Returns:
            List of verification documents with type, filename, and URL
        """
        
    def get_direct_deposit_voided_check(self, property_name: str, employee_folder: str) -> Optional[str]:
        """
        Get voided check for direct deposit (if exists)
        
        Returns:
            Signed URL to voided check image
        """
        
    def list_all_employee_documents(self, property_name: str, employee_folder: str) -> Dict:
        """
        Get all documents for an employee
        
        Returns:
            Dictionary with all document types and their URLs
        """
```

**Folder Mapping:**
```python
FOLDER_MAP = {
    'company_policies': 'company_policies',
    'i9': 'i9_form_completed',           # ✅ FINAL I-9
    'w4': 'w4_form_completed',           # ✅ FINAL W-4
    'direct_deposit': 'direct_deposit',
    'health_insurance': 'health_insurance_completed'  # ✅ FINAL Health Insurance
}
```

---

### **Task 1.2: Update Manager Review Endpoints**

**File:** `backend/app/routers/manager_review_router.py`

**Endpoints to update:**

1. **GET `/api/manager/review/employees/{employee_id}/documents`**
   - Use `DocumentStorageService.list_all_employee_documents()`
   - Return all completed documents with signed URLs

2. **GET `/api/manager/review/employees/{employee_id}/documents/{doc_type}`**
   - Use `DocumentStorageService.get_latest_document()`
   - Return specific document with signed URL

3. **GET `/api/manager/review/employees/{employee_id}/i9-verification`**
   - Use `DocumentStorageService.get_i9_verification_documents()`
   - Return all verification documents

---

### **Task 1.3: Update Employee Document Access**

**File:** `backend/app/main_enhanced.py` (or create new router)

**Endpoints to update:**

1. **GET `/api/onboarding/{employee_id}/documents`**
   - Use `DocumentStorageService.list_all_employee_documents()`
   - Return all completed documents for employee access

2. **GET `/api/onboarding/{employee_id}/documents/{doc_type}`**
   - Use `DocumentStorageService.get_latest_document()`
   - Return specific document for download

---

### **Task 1.4: Update Frontend Document Display**

**Files to update:**

1. **`frontend/src/components/manager/ManagerReviewInterface.tsx`**
   - Update document fetching to use new endpoints
   - Display correct document versions

2. **`frontend/src/pages/EmployeeDocuments.tsx`** (if exists)
   - Update to fetch from new endpoints
   - Show completed documents only

---

## 🎯 **Phase 2: Complete Review Implementation**

### **Task 2.1: Backend - Complete Review Endpoint**

**File:** `backend/app/routers/manager_document_approval_router.py`

**Status:** ✅ Already implemented (according to COMPLETE_REVIEW_IMPLEMENTATION_DONE.md)

**Verify:**
- [ ] Endpoint exists: `POST /api/manager/review/employees/{employee_id}/complete-review`
- [ ] Request model: `CompleteReviewRequest`
- [ ] Updates employee status to "active"
- [ ] Sends completion email

**If not implemented, create:**

```python
@router.post("/employees/{employee_id}/complete-review")
async def complete_employee_review(
    employee_id: str,
    request: CompleteReviewRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Complete manager review and activate employee
    
    Steps:
    1. Verify all 5 documents are approved
    2. Update employee record
    3. Send completion email
    4. Return success response
    """
```

---

### **Task 2.2: Backend - Onboarding Completion Email**

**File:** `backend/app/email_service.py`

**Status:** ✅ Already implemented (according to COMPLETE_REVIEW_IMPLEMENTATION_DONE.md)

**Verify:**
- [ ] Method exists: `send_onboarding_completion_email()`
- [ ] Beautiful HTML template
- [ ] Plain text fallback
- [ ] CC to manager

**If not implemented, create:**

```python
async def send_onboarding_completion_email(
    employee_email: str,
    employee_name: str,
    property_name: str,
    position: str,
    department: str,
    employee_number: str,
    start_date: str,
    start_time: str,
    manager_name: str,
    manager_email: str,
    manager_phone: str,
    dress_code: str,
    parking_details: str,
    notes: Optional[str] = None
):
    """
    Send beautiful onboarding completion email to employee
    """
```

---

### **Task 2.3: Frontend - Complete Review Modal**

**File:** `frontend/src/components/manager/CompleteReviewModal.tsx`

**Status:** ✅ Already implemented (according to COMPLETE_REVIEW_IMPLEMENTATION_DONE.md)

**Verify:**
- [ ] Component exists
- [ ] Auto-generates employee number
- [ ] Date/time pickers
- [ ] Form validation
- [ ] Calls backend endpoint

**If not implemented, create modal with:**
- Employee information display
- Start date picker (default: today)
- Start time input (default: 9:00 AM)
- Employee number input (auto-generated)
- Dress code input
- Parking details input
- Optional notes textarea
- Submit button

---

### **Task 2.4: Frontend - Manager Review Interface Integration**

**File:** `frontend/src/components/manager/ManagerReviewInterface.tsx`

**Status:** ✅ Already implemented (according to COMPLETE_REVIEW_IMPLEMENTATION_DONE.md)

**Verify:**
- [ ] Shows "Complete Review" button when all documents approved
- [ ] Green sticky footer at bottom
- [ ] Opens CompleteReviewModal on click
- [ ] Reloads after completion

**If not implemented, add:**
- Check if all 5 documents are approved
- Show green sticky footer button
- Handle modal open/close
- Refresh documents after completion

---

### **Task 2.5: Frontend - Service Integration**

**File:** `frontend/src/services/managerReviewService.ts`

**Status:** ✅ Already implemented (according to COMPLETE_REVIEW_IMPLEMENTATION_DONE.md)

**Verify:**
- [ ] Method exists: `completeReview()`
- [ ] Calls backend endpoint
- [ ] Returns response

**If not implemented, add:**

```typescript
async completeReview(employeeId: string, data: {
  startDate: string;
  startTime: string;
  employeeNumber: string;
  dressCode?: string;
  parkingDetails?: string;
  notes?: string;
}): Promise<any> {
  const response = await api.post(
    `/manager/review/employees/${employeeId}/complete-review`,
    data
  );
  return response.data;
}
```

---

## 📊 **Implementation Checklist**

### **Phase 1: Bucket Structure (Priority: HIGH)**

- [ ] **Task 1.1:** Create `DocumentStorageService`
  - [ ] Implement `get_latest_document()`
  - [ ] Implement `get_i9_verification_documents()`
  - [ ] Implement `get_direct_deposit_voided_check()`
  - [ ] Implement `list_all_employee_documents()`
  - [ ] Add unit tests

- [ ] **Task 1.2:** Update Manager Review Endpoints
  - [ ] Update GET `/api/manager/review/employees/{employee_id}/documents`
  - [ ] Update GET `/api/manager/review/employees/{employee_id}/documents/{doc_type}`
  - [ ] Update GET `/api/manager/review/employees/{employee_id}/i9-verification`
  - [ ] Test all endpoints

- [ ] **Task 1.3:** Update Employee Document Access
  - [ ] Update GET `/api/onboarding/{employee_id}/documents`
  - [ ] Update GET `/api/onboarding/{employee_id}/documents/{doc_type}`
  - [ ] Test employee document access

- [ ] **Task 1.4:** Update Frontend Document Display
  - [ ] Update `ManagerReviewInterface.tsx`
  - [ ] Update `EmployeeDocuments.tsx` (if exists)
  - [ ] Test document display

### **Phase 2: Complete Review (Priority: MEDIUM)**

- [ ] **Task 2.1:** Verify/Implement Backend Endpoint
  - [ ] Check if endpoint exists
  - [ ] Verify request/response models
  - [ ] Test endpoint functionality

- [ ] **Task 2.2:** Verify/Implement Email Service
  - [ ] Check if method exists
  - [ ] Verify email template
  - [ ] Test email sending

- [ ] **Task 2.3:** Verify/Implement Frontend Modal
  - [ ] Check if component exists
  - [ ] Verify form fields
  - [ ] Test modal functionality

- [ ] **Task 2.4:** Verify/Implement Interface Integration
  - [ ] Check if button appears
  - [ ] Verify modal integration
  - [ ] Test complete workflow

- [ ] **Task 2.5:** Verify/Implement Service Integration
  - [ ] Check if method exists
  - [ ] Verify API call
  - [ ] Test service integration

---

## 🧪 **Testing Plan**

### **Phase 1 Testing:**

1. **Document Retrieval:**
   - [ ] Test getting latest I-9 (should use `i9_form_completed`)
   - [ ] Test getting latest W-4 (should use `w4_form_completed`)
   - [ ] Test getting latest Health Insurance (should use `health_insurance_completed`)
   - [ ] Test getting I-9 verification documents
   - [ ] Test getting all employee documents

2. **Manager Review:**
   - [ ] Test viewing employee documents
   - [ ] Test viewing specific document
   - [ ] Test viewing I-9 verification documents

3. **Employee Access:**
   - [ ] Test employee viewing their documents
   - [ ] Test employee downloading documents

### **Phase 2 Testing:**

1. **Complete Review Workflow:**
   - [ ] Approve all 5 documents
   - [ ] Verify "Complete Review" button appears
   - [ ] Click button and verify modal opens
   - [ ] Fill in modal and submit
   - [ ] Verify employee status updated
   - [ ] Verify email sent to employee
   - [ ] Verify manager receives CC
   - [ ] Verify success message shown

2. **Email Testing:**
   - [ ] Check email on desktop client
   - [ ] Check email on mobile client
   - [ ] Check email on web (Gmail, Outlook)
   - [ ] Verify all information is correct
   - [ ] Verify formatting is correct

---

## 🚀 **Deployment Plan**

### **Step 1: Deploy Phase 1 (Bucket Structure)**
1. Create `DocumentStorageService`
2. Update backend endpoints
3. Update frontend components
4. Test thoroughly
5. Deploy to production
6. Monitor for issues

### **Step 2: Deploy Phase 2 (Complete Review)**
1. Verify/implement backend endpoint
2. Verify/implement email service
3. Verify/implement frontend components
4. Test complete workflow
5. Deploy to production
6. Monitor for issues

---

## 📝 **Notes**

- Phase 1 is **HIGH PRIORITY** - fixes critical document retrieval issues
- Phase 2 is **MEDIUM PRIORITY** - may already be implemented
- Test thoroughly before deploying to production
- Monitor email delivery and document access after deployment
- Keep documentation updated as implementation progresses

---

## ✅ **Success Criteria**

### **Phase 1:**
- ✅ All documents retrieved from correct folders
- ✅ I-9 uses `i9_form_completed` folder
- ✅ W-4 uses `w4_form_completed` folder
- ✅ Health Insurance uses `health_insurance_completed` folder
- ✅ Verification documents accessible
- ✅ No broken document links

### **Phase 2:**
- ✅ Manager can complete review
- ✅ Employee receives beautiful email
- ✅ Employee status updated to "active"
- ✅ Employee number assigned
- ✅ Onboarding status "completed"
- ✅ Manager receives CC of email

---

**Ready to implement!** 🎉

