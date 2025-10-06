# Manager Review Implementation Plan

## 📋 Current State Analysis

### ✅ What's Already Working

1. **OTP Verification & Session Management**
   - ✅ OTP sent to manager email when starting review
   - ✅ Session stored in `localStorage` (persists across refreshes)
   - ✅ **Timer already removed** - session lasts until browser closed or manual logout
   - ✅ No need to re-enter OTP on refresh
   - Location: `frontend/hotel-onboarding-frontend/src/services/sessionStorageService.ts`

2. **Email Notification on Onboarding Completion**
   - ✅ Triggered when employee completes final review step
   - ✅ Endpoint: `POST /api/onboarding/{employee_id}/complete-onboarding`
   - ✅ Updates employee status to `manager_review_status: 'pending_review'`
   - ✅ Sends email to manager with review link
   - Location: `backend/app/main_enhanced.py` (lines 18099-18320)

3. **Manager Dashboard - Pending Reviews Tab**
   - ✅ Shows employees awaiting manager review
   - ✅ Displays I-9 Section 2 deadline urgency
   - ✅ "Start Review" button navigates to review interface
   - Location: `frontend/hotel-onboarding-frontend/src/components/dashboard/PendingReviewsTab.tsx`

4. **Document Storage Architecture**
   - ✅ Bucket: `onboarding-documents`
   - ✅ Path structure implemented:
     ```
     {property_name}/{employee_name}/forms/{form_type}/{filename}
     {property_name}/{employee_name}/uploads/{document_type}/{filename}
     ```
   - ✅ Signed documents saved with timestamp and UUID
   - Location: `backend/app/supabase_service_enhanced.py`

---

## 🎯 Implementation Requirements

### Document Review Workflow Order

The manager must review and approve documents in this **sequential order**:

1. **Company Policies** (`company_policies`)
   - Manager verifies employee signature
   - No manager action needed (view only)
   - Status: `approved` → unlock next step

2. **I-9 Form** (`i9`)
   - Manager reviews I-9 Section 1 (employee-filled)
   - Manager compares with uploaded verification documents:
     - Driver's License (front/back)
     - Passport
     - SSN Card
   - Manager fills I-9 Section 2 (employer verification)
   - Manager signs I-9 Section 2
   - **Critical**: Must be completed within 3 business days of start date
   - Status: `approved` → unlock next step

3. **W-4 Form** (`w4`)
   - Manager reviews W-4 filled by employee
   - Manager verifies SSN matches uploaded SSN card
   - Manager can edit employer information if needed
   - Manager signs W-4
   - Status: `approved` → unlock next step

4. **Direct Deposit** (`direct_deposit`)
   - Manager reviews direct deposit form
   - **Voided check is embedded in the PDF** (no separate folder)
   - Manager verifies bank account information
   - Manager signs direct deposit form
   - Status: `approved` → unlock next step

5. **Health Insurance** (`health_insurance`)
   - Manager reviews health insurance enrollment
   - Manager verifies dependent information (if applicable)
   - Manager signs health insurance form
   - Status: `approved` → complete review

---

## 🔧 Technical Implementation Plan

### Phase 1: Document Workflow Service ✅ (Already Exists)

**File**: `frontend/hotel-onboarding-frontend/src/services/documentVerificationService.ts`

**Current Implementation**:
- ✅ `getAllDocumentsStatus()` - Gets status of all documents
- ✅ `canReviewDocument()` - Checks if document can be reviewed (sequential logic)
- ✅ `approveDocument()` - Marks document as approved
- ✅ `rejectDocument()` - Marks document as rejected

**Sequential Logic**:
```typescript
// Document can only be reviewed if:
// 1. Previous document is approved
// 2. Current document is not already approved
// 3. Session is valid
```

---

### Phase 2: Document Review Modal Components

**Current Components**:
1. ✅ `DocumentWorkflowStepper.tsx` - Shows progress and sequential steps
2. ✅ `DocumentReviewModal.tsx` - Modal for reviewing individual documents
3. ✅ `ManagerReviewInterface.tsx` - Main review interface

**What Needs Enhancement**:

#### A. Company Policies Review
- **Action**: View-only verification
- **UI**: Display signed PDF with employee signature
- **Manager Action**: Click "Approve" to confirm signature is present
- **No editing needed**

#### B. I-9 Review & Section 2 Completion
- **Action**: Review Section 1 + Fill Section 2
- **UI Components**:
  - Side-by-side view: Employee data (Section 1) | Manager form (Section 2)
  - Document viewer: Show uploaded verification docs (DL, Passport, SSN)
  - Form fields for Section 2:
    - Document title
    - Issuing authority
    - Document number
    - Expiration date
    - Employer name, address
    - First day of employment
    - Manager signature
  - **PDF Generation**: Combine Section 1 + Section 2 into single I-9 PDF
  - **Storage**: Replace employee's I-9 with final manager-signed version

#### C. W-4 Review & Signature
- **Action**: Review + Sign
- **UI Components**:
  - Display employee-filled W-4 data
  - Show uploaded SSN card for verification
  - Editable employer information fields
  - Manager signature field
  - **PDF Generation**: Generate final W-4 with manager signature
  - **Storage**: Replace employee's W-4 with final version

#### D. Direct Deposit Review & Signature
- **Action**: Review + Sign
- **UI Components**:
  - Display employee bank information
  - Show embedded voided check image in PDF
  - Manager signature field
  - **PDF Generation**: Generate final direct deposit form with manager signature
  - **Storage**: Replace employee's direct deposit PDF with final version

#### E. Health Insurance Review & Signature
- **Action**: Review + Sign
- **UI Components**:
  - Display employee selections
  - Show dependent information (if applicable)
  - Manager signature field
  - **PDF Generation**: Generate final health insurance form with manager signature
  - **Storage**: Replace employee's health insurance PDF with final version

---

### Phase 3: PDF Generation & Storage Strategy

**Current Implementation**:
- ✅ Employee PDFs generated and stored in `forms/{form_type}/`
- ✅ Uploaded documents stored in `uploads/{document_type}/`

**Required Changes**:

#### Document Replacement Strategy
When manager completes review and signs:

1. **Generate new PDF** with manager's signature/data
2. **Upload to same path** with new timestamp:
   ```
   {property_name}/{employee_name}/forms/{form_type}/{form_type}_signed_{timestamp}_{uuid}.pdf
   ```
3. **Archive old PDF** (optional - move to `forms/{form_type}/archive/`)
4. **Update database**:
   - `signed_documents` table: Insert new record with manager signature
   - `employees` table: Update `manager_review_status` for each document
   - `manager_review_actions` table: Log approval action

#### Database Schema Updates Needed

**Table**: `employees`
```sql
-- Add columns for tracking individual document approvals
ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_policies_approved_at TIMESTAMP;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS i9_manager_approved_at TIMESTAMP;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS w4_manager_approved_at TIMESTAMP;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS direct_deposit_manager_approved_at TIMESTAMP;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS health_insurance_manager_approved_at TIMESTAMP;
```

**Table**: `manager_review_actions` (already exists)
```sql
-- Tracks each manager action during review
id UUID PRIMARY KEY
employee_id UUID REFERENCES employees(id)
manager_id UUID REFERENCES users(id)
action_type VARCHAR(50) -- 'approved', 'rejected', 'edited', 'viewed'
document_type VARCHAR(100) -- 'company_policies', 'i9', 'w4', etc.
comments TEXT
metadata JSONB -- IP, user agent, edited fields, etc.
created_at TIMESTAMP
```

---

### Phase 4: Backend API Endpoints

**Existing Endpoints**:
- ✅ `GET /api/manager/review/employees/{employee_id}` - Get employee data
- ✅ `POST /api/manager/review/employees/{employee_id}/start-review` - Start review session
- ✅ `POST /api/manager/document-access/request-otp` - Request OTP
- ✅ `POST /api/manager/document-access/verify-otp` - Verify OTP

**New Endpoints Needed**:

```python
# 1. Get document for review
GET /api/manager/review/employees/{employee_id}/documents/{document_type}
Response: {
  "document_url": "signed_url",
  "employee_data": {...},
  "uploaded_documents": [...],  # For I-9 verification docs
  "can_edit": true/false,
  "status": "pending" | "approved" | "rejected"
}

# 2. Approve document (view-only like company policies)
POST /api/manager/review/employees/{employee_id}/documents/{document_type}/approve
Body: {
  "comments": "Signature verified",
  "metadata": {...}
}

# 3. Complete and sign document (I-9, W-4, Direct Deposit, Health Insurance)
POST /api/manager/review/employees/{employee_id}/documents/{document_type}/complete
Body: {
  "form_data": {...},  # Manager-filled data (e.g., I-9 Section 2)
  "signature": {...},  # Manager signature
  "edited_fields": [...],  # Track what was changed
  "comments": "Completed I-9 Section 2"
}
Response: {
  "success": true,
  "pdf_url": "signed_url_to_final_pdf",
  "next_document": "w4"  # What to review next
}

# 4. Complete entire review
POST /api/manager/review/employees/{employee_id}/complete-review
Body: {
  "final_comments": "All documents reviewed and approved",
  "completion_signature": {...}
}
Response: {
  "success": true,
  "message": "Review completed. Employee ready for HR approval."
}
```

---

## 📊 UI/UX Flow

### Manager Dashboard → Review Flow

```
1. Manager Dashboard
   └─ "Pending Reviews" tab
      └─ Shows employees with status "pending_review"
      └─ Click "Start Review" button
         └─ Navigate to /manager/review/{employee_id}

2. OTP Verification Modal
   └─ Enter 6-digit OTP (sent to email)
   └─ Session saved to localStorage
   └─ No timer - persists until browser closed

3. Review Interface
   └─ Document Workflow Stepper (left sidebar)
      ├─ Step 1: Company Policies ✓
      ├─ Step 2: I-9 Form (current)
      ├─ Step 3: W-4 Form (locked)
      ├─ Step 4: Direct Deposit (locked)
      └─ Step 5: Health Insurance (locked)
   
   └─ Document Review Modal (main area)
      ├─ Document viewer (PDF or form data)
      ├─ Uploaded documents (for I-9)
      ├─ Manager form fields (for I-9 Section 2, etc.)
      ├─ Signature pad
      └─ Actions: [Approve] [Reject] [Save Draft]

4. Completion
   └─ All documents approved
   └─ Final confirmation modal
   └─ Update employee status to "hr_approval"
   └─ Send notification to HR
```

---

## 🚀 Next Steps - Prioritized

### Immediate (This Session)
1. ✅ **Verify timer is removed** - DONE (already implemented)
2. ✅ **Verify OTP session persistence** - DONE (already implemented)
3. ✅ **Verify email notification** - DONE (already implemented)
4. **Review UI/UX** of existing components
5. **Create detailed task breakdown** for document review modals

### Short-term (Next 1-2 days)
1. Implement Company Policies review modal (simplest - view only)
2. Implement I-9 Section 2 completion modal
3. Implement W-4 review and signature modal
4. Implement Direct Deposit review and signature modal
5. Implement Health Insurance review and signature modal

### Medium-term (Next 3-5 days)
1. Backend endpoints for document approval
2. PDF generation for manager-signed documents
3. Document replacement logic
4. Database schema updates
5. Testing and QA

---

## 📝 Notes

- **Timer**: Already removed - session uses localStorage with no expiration
- **Email**: Already working - triggered on onboarding completion
- **Sequential workflow**: Already implemented in `documentVerificationService.ts`
- **Storage architecture**: Already matches requirements
- **Main work needed**: Document review modals and backend endpoints for signing/approval

