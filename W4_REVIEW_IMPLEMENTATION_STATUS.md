# W-4 Manager Review - Implementation Status

## ✅ What's Been Implemented

### **Frontend Component: W4ReviewModal.tsx**

Created a 2-step modal for W-4 review:

#### **Step 1: Review & Verify**
- ✅ **Left Panel**: W-4 PDF viewer (employee-completed form)
- ✅ **Right Panel**: SSN Card image viewer
- ✅ **SSN Verification Checkbox**: Manager verifies SSN matches SSN card
- ✅ **Notes Field**: Optional manager notes
- ✅ **Navigation**: "Next: Add Employer Info" button

#### **Step 2: Employer Information**
- ✅ **Employer Name and Address** (auto-filled from employer profile)
- ✅ **Employer EIN** (auto-filled from employer profile)
- ✅ **First Day of Employment** (auto-filled from employee start date)
- ✅ **Manager Signature** (placeholder - needs signature capture integration)
- ✅ **Navigation**: "Complete W-4" button

### **Service Methods**

Added to `managerReviewService.ts`:

1. ✅ **`getW4ReviewDetail(employeeId)`**
   - Fetches W-4 PDF URL
   - Fetches SSN card URL
   - Returns employee data
   - Returns employer profile for auto-fill

2. ✅ **`completeW4(employeeId, data)`**
   - Sends employer information
   - Sends manager signature
   - Sends SSN verification status
   - Sends optional notes

---

## ❌ What Still Needs to Be Done

### **Backend Endpoints** (Priority: HIGH)

#### **1. GET /api/manager/review/employees/{id}/documents/w4/detail**

```python
@router.get("/{employee_id}/documents/w4/detail")
async def get_w4_review_detail(
    employee_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Return W-4 review data:
    - W-4 PDF URL (employee-signed)
    - SSN card image URL
    - Employee data (name, SSN last 4, address)
    - Employee start date
    - Employer profile (for auto-fill)
    """
    # 1. Get employee data
    # 2. Get W-4 PDF from storage: forms/w4_form/w4_form_signed_*.pdf
    # 3. Get SSN card from storage: uploads/i9_verification/ssn_card/*
    # 4. Get employer profile
    # 5. Return all data
```

**Response:**
```json
{
  "pdfUrl": "https://.../w4_form_signed_xxx.pdf",
  "ssnCardUrl": "https://.../ssn_card.jpg",
  "employeeData": {
    "name": "John Doe",
    "ssn": "1234",  // Last 4 digits only
    "address": "123 Main St, City, ST 12345"
  },
  "employeeStartDate": "2025-10-05",
  "employerProfile": {
    "ein": "12-3456789",
    "business_legal_name": "Hotel ABC",
    "street_address": "456 Business Ave",
    "suite_apt": "Suite 100",
    "city": "New York",
    "state": "NY",
    "zip_code": "10001",
    "i9_employer_name": "Jane Manager",
    "i9_employer_title": "General Manager"
  }
}
```

---

#### **2. POST /api/manager/review/employees/{id}/documents/w4/complete**

```python
@router.post("/{employee_id}/documents/w4/complete")
async def complete_w4_document(
    employee_id: str,
    request: CompleteW4Request,
    current_user: User = Depends(get_current_user)
):
    """
    Complete W-4 review:
    1. Load employee's W-4 PDF
    2. Add employer information to PDF:
       - Employer Name and Address (field f1_15[0])
       - Employer EIN
       - First Day of Employment
    3. Add manager signature (optional)
    4. Save as completed W-4
    5. Mark as approved in document_approvals
    6. Return next document to review
    """
    # 1. Load original W-4 PDF from storage
    # 2. Use pdf-lib or PyMuPDF to fill employer fields
    # 3. Add manager signature if provided
    # 4. Save to: forms/w4_form_completed/w4_form_completed_signed_*.pdf
    # 5. Update document_approvals table
    # 6. Return success + next document
```

**Request:**
```json
{
  "employerName": "Hotel ABC",
  "employerAddress": "Hotel ABC, 456 Business Ave Suite 100, New York, NY 10001",
  "employerEIN": "12-3456789",
  "firstDayOfEmployment": "2025-10-05",
  "signature": {
    "dataUrl": "data:image/png;base64,...",
    "timestamp": "2025-10-05T20:00:00Z"
  },
  "ssnVerified": true,
  "notes": "SSN verified, all information correct"
}
```

**Response:**
```json
{
  "success": true,
  "completedPdfUrl": "https://.../w4_form_completed_signed_xxx.pdf",
  "nextDocument": "direct_deposit",
  "message": "W-4 completed successfully"
}
```

---

### **Backend Models** (Priority: HIGH)

Add to `backend/app/routers/manager_document_approval_router.py`:

```python
class CompleteW4Request(BaseModel):
    employerName: str
    employerAddress: str
    employerEIN: str
    firstDayOfEmployment: str
    signature: SignatureData
    ssnVerified: bool
    notes: Optional[str] = None
```

---

### **PDF Generation** (Priority: HIGH)

Update `backend/app/pdf_forms.py` to add employer fields to W-4:

```python
def fill_w4_employer_section(self, pdf_bytes: bytes, employer_data: dict) -> bytes:
    """
    Fill employer section of W-4 form
    
    Fields to fill:
    - f1_15[0]: Employer Name and Address
    - (Add EIN field if exists)
    - (Add First Day of Employment field if exists)
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    
    # Fill employer fields
    # Field f1_15[0] = Employer Name and Address
    
    # Add manager signature if provided
    
    # Save and return
    return doc.tobytes()
```

---

### **Frontend Integration** (Priority: MEDIUM)

#### **1. Integrate W4ReviewModal into ManagerReviewInterface**

Update `ManagerReviewInterface.tsx`:

```typescript
import { W4ReviewModal } from './w4/W4ReviewModal';

// Add state
const [showW4Modal, setShowW4Modal] = useState(false);

// Add handler
const handleW4Review = () => {
  setShowW4Modal(true);
};

// Add modal
{showW4Modal && (
  <W4ReviewModal
    isOpen={showW4Modal}
    onClose={() => setShowW4Modal(false)}
    employeeId={employeeId}
    onComplete={handleW4Complete}
  />
)}
```

#### **2. Add Signature Capture**

Integrate `DigitalSignatureCapture` component into W4ReviewModal:

```typescript
import { DigitalSignatureCapture } from '../DigitalSignatureCapture';

// Add state
const [showSignature, setShowSignature] = useState(false);

// Add handler
const handleSignatureComplete = (signatureData: any) => {
  setEmployerData({
    ...employerData,
    signature: {
      dataUrl: signatureData.signatureData,
      timestamp: new Date().toISOString()
    }
  });
  setShowSignature(false);
};

// Replace signature button with modal
{showSignature && (
  <DigitalSignatureCapture
    documentName="W-4 Employer Certification"
    signerName={employerData.employerName}
    signerTitle="Manager"
    onSignatureComplete={handleSignatureComplete}
    onCancel={() => setShowSignature(false)}
  />
)}
```

---

## 📊 Storage Structure

### **W-4 Document Flow:**

1. **Employee Completes W-4:**
   - Saved to: `forms/w4_form/w4_form_signed_{timestamp}_{uuid}.pdf`
   - Contains: Employee data + employee signature

2. **Manager Completes W-4:**
   - Saved to: `forms/w4_form_completed/w4_form_completed_signed_{timestamp}_{uuid}.pdf`
   - Contains: Employee data + employee signature + employer info + manager signature

3. **SSN Card Reference:**
   - Location: `uploads/i9_verification/ssn_card/*.jpg`
   - Used for: SSN verification

---

## 🧪 Testing Checklist

- [ ] Backend: Create `GET /documents/w4/detail` endpoint
- [ ] Backend: Create `POST /documents/w4/complete` endpoint
- [ ] Backend: Test W-4 PDF employer field filling
- [ ] Backend: Test manager signature addition
- [ ] Frontend: Integrate W4ReviewModal into ManagerReviewInterface
- [ ] Frontend: Add signature capture integration
- [ ] Frontend: Test W-4 review flow end-to-end
- [ ] Test: SSN verification checkbox works
- [ ] Test: Employer data auto-fills from profile
- [ ] Test: Completed PDF has employer info + signature
- [ ] Test: Approval unlocks Direct Deposit review
- [ ] Test: document_approvals table updated correctly

---

## 🚀 Next Steps

1. **Create backend endpoints** (GET detail + POST complete)
2. **Implement PDF employer field filling** in backend
3. **Integrate signature capture** in frontend
4. **Test end-to-end flow**
5. **Move to Direct Deposit review**

---

## 📝 Notes

- W-4 doesn't require employer signature by IRS (optional)
- SSN verification is critical - must match SSN card
- Employer EIN format: XX-XXXXXXX
- First Day of Employment should match employee start date
- No "verified" PDF needed (simpler than I-9 flow)

