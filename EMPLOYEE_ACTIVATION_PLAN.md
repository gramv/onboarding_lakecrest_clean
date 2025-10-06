# Employee Activation & Document Access - Implementation Plan

## 🎯 **Overview**

After manager completes all document approvals, convert the candidate to an active employee and make all their completed documents available in the manager's employee section.

---

## 📋 **Current State Analysis**

### **What We Have:**
1. ✅ Employee record exists (created during onboarding initiation)
2. ✅ All onboarding documents completed and signed
3. ✅ Manager has reviewed and approved all documents
4. ✅ Document approvals stored in `document_approvals` table
5. ✅ Signed documents stored in Supabase Storage

### **What's Missing:**
1. ❌ Employee status is still "pending" or "manager_reviewing"
2. ❌ Employee doesn't appear in manager's active employee list
3. ❌ Documents aren't accessible from employee profile
4. ❌ No "Complete Review" button to finalize the process

---

## 🏗️ **Implementation Plan**

### **Phase 1: Complete Manager Review Endpoint**

**Endpoint:** `POST /api/manager/review/employees/{id}/complete-review`

**Purpose:** Finalize manager review and activate employee

**Request:**
```json
{
  "notes": "All documents approved. Ready for employment.",
  "startDate": "2025-10-07",  // Optional - override hire date
  "employeeNumber": "EMP-2025-001"  // Optional - assign employee number
}
```

**Process:**
1. Verify all required documents are approved
2. Update employee status:
   - `manager_review_status`: "completed"
   - `manager_review_completed_at`: current timestamp
   - `employment_status`: "active"
   - `onboarding_status`: "completed"
3. Assign employee number (if not already assigned)
4. Create employee activation milestone
5. Send notification to HR (if applicable)
6. Return success with employee profile

**Response:**
```json
{
  "success": true,
  "message": "Employee activated successfully",
  "employee": {
    "id": "...",
    "employeeNumber": "EMP-2025-001",
    "status": "active",
    "startDate": "2025-10-07"
  }
}
```

---

### **Phase 2: Employee List Integration**

**Update Existing Endpoint:** `GET /api/manager/employees`

**Current Behavior:**
- Returns employees with `employment_status = 'active'`
- Filters by manager's property

**New Behavior:**
- Include employees with `manager_review_status = 'completed'`
- Show onboarding completion status
- Include document count

**Response Enhancement:**
```json
{
  "employees": [
    {
      "id": "...",
      "employeeNumber": "EMP-2025-001",
      "firstName": "Benjamin",
      "lastName": "Thomas",
      "position": "Housekeeping",
      "department": "Front Office",
      "hireDate": "2025-10-11",
      "status": "active",
      "onboardingStatus": "completed",
      "onboardingCompletedAt": "2025-10-04T17:46:16.967Z",
      "documentsCount": 6,
      "hasAllDocuments": true
    }
  ]
}
```

---

### **Phase 3: Employee Document Access**

**Endpoint:** `GET /api/manager/employees/{id}/documents`

**Purpose:** Get all completed documents for an active employee

**Response:**
```json
{
  "employee": {
    "id": "...",
    "name": "Benjamin Thomas",
    "employeeNumber": "EMP-2025-001"
  },
  "documents": [
    {
      "type": "company_policies",
      "name": "Company Policies",
      "status": "approved",
      "approvedAt": "2025-10-05T18:45:39.957Z",
      "approvedBy": "Goutham Vemula",
      "pdfUrl": "https://...",
      "canView": true
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
      "canView": true
    },
    {
      "type": "w4",
      "name": "W-4 Tax Withholding",
      "status": "approved",
      "approvedAt": "2025-10-05T21:47:47.117Z",
      "approvedBy": "Goutham Vemula",
      "pdfUrl": "https://...",
      "canView": true
    },
    {
      "type": "direct_deposit",
      "name": "Direct Deposit Authorization",
      "status": "approved",
      "approvedAt": "2025-10-05T22:10:13.722Z",
      "approvedBy": "Goutham Vemula",
      "pdfUrl": "https://...",
      "supportingDocuments": [
        {
          "type": "voided_check",
          "url": "https://..."
        }
      ],
      "canView": true
    },
    {
      "type": "health_insurance",
      "name": "Health Insurance Enrollment",
      "status": "approved",
      "approvedAt": "2025-10-05T22:15:00.000Z",
      "approvedBy": "Goutham Vemula",
      "pdfUrl": "https://...",
      "canView": true
    }
  ]
}
```

---

### **Phase 4: Frontend - Complete Review Button**

**Location:** `ManagerReviewInterface.tsx`

**UI Addition:**
```tsx
{/* Show when all documents are approved */}
{allDocumentsApproved && (
  <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <div>
        <h3 className="font-semibold text-gray-900">All Documents Approved</h3>
        <p className="text-sm text-gray-600">
          Ready to activate employee and complete review
        </p>
      </div>
      <button
        onClick={handleCompleteReview}
        className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
      >
        Complete Review & Activate Employee
      </button>
    </div>
  </div>
)}
```

**Flow:**
1. Check if all documents approved
2. Show "Complete Review" button
3. Click button → Show confirmation modal
4. Confirm → Call complete-review endpoint
5. Success → Redirect to employee list or employee profile

---

### **Phase 5: Frontend - Employee Documents View**

**New Component:** `EmployeeDocumentsView.tsx`

**Location:** Manager Dashboard → Employees → [Employee Name] → Documents

**Features:**
- List all completed documents
- View PDFs in modal
- Download documents
- See approval history
- View supporting documents (I-9 verification, voided checks, etc.)

**UI Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Employee Documents - Benjamin Thomas                    │
│ Employee #: EMP-2025-001                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 📄 Company Policies                             │   │
│ │ Approved: Oct 5, 2025 by Goutham Vemula        │   │
│ │ [View PDF] [Download]                           │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 📄 I-9 Employment Eligibility                   │   │
│ │ Approved: Oct 5, 2025 by Goutham Vemula        │   │
│ │ Verification Documents: Passport                │   │
│ │ [View PDF] [Download] [View Verification Docs]  │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 📄 W-4 Tax Withholding                          │   │
│ │ Approved: Oct 5, 2025 by Goutham Vemula        │   │
│ │ [View PDF] [Download]                           │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ... (more documents)                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 **Complete Workflow**

### **Manager Review → Employee Activation:**

1. **Manager reviews all documents** ✅
   - Company Policies → Approve
   - I-9 → Fill Section 2 → Approve
   - W-4 → Fill Employer Section → Approve
   - Direct Deposit → Approve
   - Health Insurance → Fill Employer Section → Approve

2. **All documents approved** ✅
   - "Complete Review" button appears
   - Manager clicks button

3. **Complete Review Modal** 🆕
   - Confirm employee details
   - Optional: Set start date
   - Optional: Assign employee number
   - Add final notes

4. **Employee Activated** 🆕
   - Status changed to "active"
   - Employee appears in employee list
   - Documents accessible from employee profile

5. **Manager can now:**
   - View employee in employee list
   - Access all completed documents
   - Download documents
   - View employee profile

---

## 📊 **Database Changes**

### **No Schema Changes Needed!**

All required fields already exist:
- ✅ `employees.manager_review_status`
- ✅ `employees.manager_review_completed_at`
- ✅ `employees.employment_status`
- ✅ `employees.onboarding_status`
- ✅ `employees.employee_number`
- ✅ `document_approvals` table

---

## 📝 **Files to Create/Modify**

### **Backend:**
1. ✅ Add endpoint: `POST /api/manager/review/employees/{id}/complete-review`
2. ✅ Update endpoint: `GET /api/manager/employees` (include completed onboarding)
3. ✅ Enhance endpoint: `GET /api/manager/employees/{id}/documents`

### **Frontend:**
1. ✅ Update: `ManagerReviewInterface.tsx` (add Complete Review button)
2. ✅ Create: `CompleteReviewModal.tsx`
3. ✅ Create: `EmployeeDocumentsView.tsx`
4. ✅ Update: `managerReviewService.ts` (add completeReview method)

---

## ✅ **Success Criteria**

- ✅ Manager can complete review after all documents approved
- ✅ Employee status changes to "active"
- ✅ Employee appears in manager's employee list
- ✅ All documents accessible from employee profile
- ✅ Documents can be viewed and downloaded
- ✅ Supporting documents (I-9 verification, voided checks) accessible
- ✅ Approval history visible

---

---

## 📧 **Phase 6: Onboarding Completion Email**

### **Email Template: "Welcome to the Team!"**

**Sent to:** Employee
**Sent when:** Manager completes review and activates employee
**CC:** Manager (optional)

**Email Content:**

```html
Subject: 🎉 Congratulations! Your Onboarding is Complete - Welcome to [Property Name]

Dear [Employee Name],

Congratulations! We're thrilled to inform you that your onboarding process has been
successfully completed. You are now officially part of the [Property Name] team!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR EMPLOYMENT DETAILS

Position: [Position]
Department: [Department]
Employee Number: [Employee Number]
Start Date: [Start Date]
Start Time: [Start Time]
Work Location: [Property Address]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT'S NEXT?

✓ All your onboarding documents have been reviewed and approved
✓ Your employee profile has been activated
✓ You're all set to begin your new role!

FIRST DAY INFORMATION

📅 Date: [Start Date]
🕐 Time: [Start Time]
📍 Location: [Property Address]
🚪 Report to: [Manager Name]

What to Bring:
• Valid government-issued photo ID
• Completed I-9 verification documents (if not already submitted)
• Any additional documents requested by your manager

What to Expect:
• Welcome orientation and facility tour
• Meet your team members
• Review of your role and responsibilities
• Setup of your work station and access credentials

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR MANAGER

Name: [Manager Name]
Email: [Manager Email]
Phone: [Manager Phone]

Feel free to reach out if you have any questions before your start date!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT REMINDERS

• Please arrive 15 minutes early on your first day
• Dress code: [Dress Code]
• Parking information: [Parking Details]
• If you need to reschedule, contact your manager immediately

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We're excited to have you join our team and look forward to seeing you on [Start Date]!

Welcome aboard!

Best regards,
The [Property Name] Team

---
This is an automated message from the Hotel Onboarding System.
Employee ID: [Employee ID]
```

### **Email Service Method:**

```python
async def send_onboarding_completion_email(
    self,
    employee_email: str,
    employee_name: str,
    employee_number: str,
    position: str,
    department: str,
    start_date: str,
    start_time: str,
    property_name: str,
    property_address: str,
    manager_name: str,
    manager_email: str,
    manager_phone: str = None,
    dress_code: str = "Business casual",
    parking_details: str = "Employee parking available on-site",
    cc_manager: bool = True
) -> bool:
    """
    Send onboarding completion email to employee
    Beautiful, professional email welcoming them to the team
    """
```

### **Email Features:**

1. **Professional Design**
   - Clean, modern HTML template
   - Company branding
   - Clear sections with visual separators
   - Mobile-responsive

2. **Complete Information**
   - Employment details
   - First day instructions
   - Manager contact info
   - What to bring/expect

3. **Actionable**
   - Clear next steps
   - Important reminders
   - Contact information

4. **CC to Manager**
   - Optional CC to manager
   - Keeps manager informed
   - Creates paper trail

---

## 🔄 **Complete Workflow with Email**

### **Manager Review → Employee Activation → Email Notification:**

1. **Manager reviews all documents** ✅
   - Company Policies → Approve
   - I-9 → Fill Section 2 → Approve
   - W-4 → Fill Employer Section → Approve
   - Direct Deposit → Approve
   - Health Insurance → Fill Employer Section → Approve

2. **All documents approved** ✅
   - "Complete Review" button appears
   - Manager clicks button

3. **Complete Review Modal** 🆕
   - Confirm employee details
   - Set start date & time
   - Assign employee number
   - Add final notes
   - Preview email (optional)

4. **Employee Activated** 🆕
   - Status changed to "active"
   - Employee number assigned
   - Review marked complete

5. **Email Sent** 🆕
   - Beautiful welcome email sent to employee
   - CC to manager
   - Includes all first day details
   - Manager contact information

6. **Manager can now:**
   - View employee in employee list
   - Access all completed documents
   - Download documents
   - View employee profile

---

## 🚀 **Implementation Order**

1. **Backend: Onboarding Completion Email Template** (45 min)
   - Create beautiful HTML template
   - Add email service method
   - Test email rendering

2. **Backend: Complete Review Endpoint** (30 min)
   - Verify all documents approved
   - Activate employee
   - Send completion email

3. **Frontend: Complete Review Button** (20 min)
   - Show when all approved
   - Sticky footer UI

4. **Frontend: Complete Review Modal** (30 min)
   - Confirm details
   - Set start date/time
   - Preview email option

5. **Backend: Employee Documents Endpoint** (20 min)
   - Enhanced document access

6. **Frontend: Employee Documents View** (45 min)
   - Document list UI
   - PDF viewer
   - Download options

7. **Testing & Integration** (30 min)
   - End-to-end testing
   - Email delivery testing

**Total Estimated Time:** ~3.5 hours

---

## 🎯 **Next Steps**

Ready to implement! Implementation order:
1. ✅ Create beautiful email template
2. ✅ Backend complete-review endpoint (with email)
3. ✅ Frontend complete review button & modal
4. ✅ Employee documents view
5. ✅ End-to-end testing

Let's build this! 🚀

