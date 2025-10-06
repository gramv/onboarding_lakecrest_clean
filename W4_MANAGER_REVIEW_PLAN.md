# W-4 Manager Review Implementation Plan

## 📋 Current Status Analysis

### ✅ What's Already Built:
1. **Employee W-4 Completion**: Employees fill and sign W-4 during onboarding
2. **W-4 PDF Generation**: Backend generates W-4 PDF with employee data + signature
3. **W-4 Storage**: PDFs saved to `forms/w4_form/w4_form_signed_{timestamp}_{uuid}.pdf`
4. **SSN Card Upload**: Employees upload SSN card during I-9 verification step
5. **SSN Card Storage**: Images saved to `uploads/i9_verification/ssn_card/`
6. **Backend Endpoints**: 
   - `GET /api/manager/review/employees/{id}/document/w4` (exists but needs enhancement)
   - `POST /api/manager/review/employees/{id}/document/w4/approve` (exists but basic)

### ❌ What's Missing:
1. **W-4 Review Modal**: No dedicated modal like I9ReviewModal
2. **Side-by-Side View**: No W-4 PDF + SSN card comparison view
3. **Edit Capability**: No way for manager to edit W-4 if corrections needed
4. **Verified PDF Flow**: No "verified" PDF saved after manager review
5. **Manager Signature**: No employer signature added to W-4
6. **SSN Verification**: No explicit SSN verification workflow

---

## 🎯 Implementation Plan (Similar to I-9)

### **Phase 1: W-4 Review Modal Component**

Create `W4ReviewModal.tsx` with:

#### **Step 1: Review & Verify**
- **Left Panel**: W-4 PDF (employee-signed)
- **Right Panel**: SSN Card image
- **Features**:
  - Download/Upload edited W-4 (same as I-9)
  - SSN verification checkbox
  - Notes field for manager comments
  - "Need to Edit This PDF?" button

#### **Step 2: Employer Certification (Optional)**
- **Employer Information** (if required by company policy):
  - Employer Name
  - Employer EIN
  - Employer Address
  - Date
- **Manager Signature**
- **Submit Button**

---

## 📁 File Structure

```
frontend/src/components/manager/w4/
├── W4ReviewModal.tsx          # Main modal (similar to I9ReviewModal)
├── SSNVerificationPanel.tsx   # SSN card viewer + verification
└── EmployerCertification.tsx  # Optional employer section (if needed)
```

---

## 🔄 Workflow

### **Manager Opens W-4 Review:**

1. **Load Data**:
   ```typescript
   GET /api/manager/review/employees/{id}/documents/w4/detail
   Response: {
     pdfUrl: "https://.../w4_form_signed_xxx.pdf",
     ssnCardUrl: "https://.../ssn_card.jpg",
     employeeData: { name, ssn, address, ... },
     employeeStartDate: "2025-10-05"
   }
   ```

2. **Display Side-by-Side**:
   - Left: W-4 PDF with download/upload edit capability
   - Right: SSN card image with zoom capability

3. **Manager Actions**:
   - ✅ Verify SSN matches SSN card
   - ✅ Review withholding allowances
   - ✅ Check filing status
   - ✅ Download/Edit/Upload if corrections needed
   - ✅ Add notes

4. **Click "Next" or "Approve"**:
   ```typescript
   POST /api/manager/review/employees/{id}/documents/w4/save-verified
   Body: {
     pdfBase64: "..." // Edited or original PDF
   }
   ```
   - Saves to: `forms/w4_form_verified/w4_form_verified_signed_{timestamp}_{uuid}.pdf`

5. **Optional: Add Employer Certification**:
   - If company requires employer signature on W-4
   - Add employer info + manager signature
   - Generate final PDF

6. **Mark as Approved**:
   ```typescript
   POST /api/manager/review/employees/{id}/documents/w4/complete
   Body: {
     ssnVerified: true,
     notes: "SSN verified, withholding correct",
     signature: { dataUrl, timestamp }
   }
   ```
   - Saves to: `forms/w4_form_completed/w4_form_completed_signed_{timestamp}_{uuid}.pdf`
   - Updates `document_approvals` table
   - Unlocks next document (Direct Deposit)

---

## 🔧 Backend Changes Needed

### **1. New Endpoint: Get W-4 Detail**
```python
@router.get("/{employee_id}/documents/w4/detail")
async def get_w4_review_detail(employee_id: str, current_user: User):
    """
    Return:
    - W-4 PDF URL
    - SSN card image URL
    - Employee data
    - Start date
    """
```

### **2. New Endpoint: Save Verified W-4**
```python
@router.post("/{employee_id}/documents/w4/save-verified")
async def save_verified_w4(employee_id: str, request: dict, current_user: User):
    """
    Save verified W-4 PDF (after manager review, before final approval)
    Similar to I-9 verified flow
    """
```

### **3. Enhanced Endpoint: Complete W-4**
```python
@router.post("/{employee_id}/documents/w4/complete")
async def complete_w4_document(employee_id: str, request: CompleteW4Request, current_user: User):
    """
    Complete W-4 review:
    1. Load verified PDF (or original if no edits)
    2. Add employer certification (if required)
    3. Add manager signature (if required)
    4. Save as completed
    5. Mark as approved
    """
```

---

## 📊 Database Schema

### **document_approvals Table** (already exists):
```sql
{
  "step_id": "w4",
  "status": "approved",
  "approved_by": "manager_uuid",
  "approved_at": "2025-10-05T20:00:00Z",
  "metadata": {
    "ssn_verified": true,
    "notes": "SSN verified, withholding correct",
    "verified_pdf_url": "forms/w4_form_verified/...",
    "completed_pdf_url": "forms/w4_form_completed/..."
  }
}
```

---

## 🎨 UI/UX Design

### **W4ReviewModal Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Review: W-4 Federal Tax Withholding                    [X] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┬─────────────────────────────────┐  │
│ │ W-4 Form (Employee) │ SSN Card Verification           │  │
│ │                     │                                 │  │
│ │ [PDF Viewer]        │ [Image Viewer]                  │  │
│ │                     │                                 │  │
│ │                     │ ☑ SSN matches card              │  │
│ │                     │ SSN: ***-**-1234                │  │
│ │                     │                                 │  │
│ │ [Need to Edit?]     │ Notes:                          │  │
│ │                     │ [Text area]                     │  │
│ └─────────────────────┴─────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│ [Back] [Reject] [Next: Approve W-4]                        │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Implementation Checklist

### **Frontend:**
- [ ] Create `W4ReviewModal.tsx`
- [ ] Create `SSNVerificationPanel.tsx`
- [ ] Add download/upload edit flow (same as I-9)
- [ ] Add SSN verification checkbox
- [ ] Add notes field
- [ ] Integrate with `ManagerReviewInterface.tsx`

### **Backend:**
- [ ] Create `GET /documents/w4/detail` endpoint
- [ ] Create `POST /documents/w4/save-verified` endpoint
- [ ] Enhance `POST /documents/w4/complete` endpoint
- [ ] Add verified PDF storage logic
- [ ] Add completed PDF storage logic

### **Testing:**
- [ ] Test W-4 review flow
- [ ] Test SSN verification
- [ ] Test download/edit/upload flow
- [ ] Test verified PDF saved correctly
- [ ] Test completed PDF saved correctly
- [ ] Test approval unlocks Direct Deposit

---

## 🚀 Next Steps

1. **Analyze sample W-4 PDF** to understand structure
2. **Create W4ReviewModal component** (copy I9ReviewModal structure)
3. **Create backend endpoints** for W-4 detail and verification
4. **Test end-to-end flow**
5. **Move to Direct Deposit review**

---

## 📝 Notes

- **W-4 doesn't require employer signature** by IRS rules (unlike I-9)
- **SSN verification is critical** - must match SSN card
- **Editing capability** needed for corrections (same as I-9)
- **Verified PDF flow** ensures manager review is captured
- **Similar to I-9** but simpler (no Section 2 to fill)

