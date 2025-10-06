# Manager Document Review Workflow

## Overview
Sequential document review and approval process for employee onboarding documents.

## Storage Architecture

```
onboarding-documents/
└── {property_name}/           # e.g., "Hilton_Downtown"
    └── {employee_name}/        # e.g., "John_Doe"
        ├── forms/              # Generated/Signed PDFs
        │   ├── company_policies/
        │   │   └── company_policies_signed_20251004_123456_uuid.pdf
        │   ├── i9/
        │   │   └── i9_signed_20251004_123456_uuid.pdf
        │   ├── w4/
        │   │   └── w4_signed_20251004_123456_uuid.pdf
        │   ├── direct_deposit/
        │   │   └── direct_deposit_signed_20251004_123456_uuid.pdf
        │   └── health_insurance/
        │       └── health_insurance_signed_20251004_123456_uuid.pdf
        │
        └── uploads/            # Employee uploaded documents
            └── i9_verification/
                ├── drivers_license/
                │   └── dl_front.jpg
                ├── passport/
                │   └── passport.jpg
                └── ssn_card/
                    └── ssn.jpg
```

## Workflow Sequence

### 1. **Company Policies** (Step 1)
- **Action**: Verify employee signature exists
- **Manager Task**: Review and confirm signature
- **No editing required** - just verification
- **Path**: `forms/company_policies/`

### 2. **I-9 Form** (Step 2)
- **Action**: Verify Section 1 + Fill Section 2
- **Manager Tasks**:
  1. Review employee's Section 1 completion
  2. Compare with uploaded documents:
     - Driver's License (`uploads/i9_verification/drivers_license/`)
     - Passport (`uploads/i9_verification/passport/`)
     - SSN Card (`uploads/i9_verification/ssn_card/`)
  3. Fill out Section 2 (employer section)
  4. Add manager signature
- **Path**: `forms/i9/`
- **Upload Path**: `uploads/i9_verification/`

### 3. **W-4 Form** (Step 3)
- **Action**: Verify W-4 alongside SSN card
- **Manager Tasks**:
  1. Review employee's W-4 completion
  2. Verify SSN matches SSN card (`uploads/i9_verification/ssn_card/`)
  3. Edit if corrections needed
  4. Add manager signature
- **Path**: `forms/w4/`
- **Reference**: `uploads/i9_verification/ssn_card/`

### 4. **Direct Deposit** (Step 4)
- **Action**: Verify form + embedded voided check/bank letter
- **Manager Tasks**:
  1. Review direct deposit form
  2. Verify embedded voided check or bank letter in PDF
  3. Confirm routing/account numbers match
  4. Add manager signature
- **Path**: `forms/direct_deposit/`
- **Note**: Voided check is embedded in the PDF, not separate

### 5. **Health Insurance** (Step 5)
- **Action**: Verify enrollment form
- **Manager Tasks**:
  1. Review health insurance selections
  2. Verify dependent information if applicable
  3. Add manager signature
- **Path**: `forms/health_insurance/`

## Session Management

### OTP Verification
- Manager enters OTP to start review session
- OTP sent to manager's email
- Session stored in **sessionStorage** (not localStorage)
- **No timer** - session lasts until browser tab is closed
- Refresh page = session persists (no need to re-enter OTP)

### Session Storage
```typescript
sessionStorage.setItem(`review_session_${employeeId}`, JSON.stringify({
  token: session_token
}));
```

## Document Approval Process

### For Each Document:

1. **Load Document**
   - Fetch employee-signed PDF from storage
   - Load any related uploaded documents (for I-9, W-4)
   - Display side-by-side view

2. **Manager Review**
   - View employee's completed form
   - Compare with uploaded documents (if applicable)
   - Edit fields if corrections needed
   - Add notes/comments

3. **Manager Signature**
   - Capture manager's digital signature
   - Add timestamp and IP address
   - Include manager's name and title

4. **Save Final Version**
   - Generate new PDF with manager's edits + signature
   - **Replace** original document in storage
   - Update `document_approvals` table
   - Move to next document in sequence

### Database Updates

```sql
-- Update document_approvals table
UPDATE document_approvals
SET 
  status = 'approved',
  approved_by = manager_id,
  approved_at = NOW(),
  manager_signature_url = signature_url,
  manager_notes = notes,
  final_document_url = new_pdf_url
WHERE employee_id = ? AND document_type = ?;
```

## API Endpoints

### Get Documents Status
```
GET /api/manager/review/employees/{employee_id}/documents-status
```
Returns:
- List of all documents
- Current step in workflow
- Approval status for each document
- URLs to documents and uploads

### Get Document for Review
```
GET /api/manager/review/employees/{employee_id}/documents/{document_type}
```
Returns:
- Document PDF URL
- Related upload URLs (for I-9, W-4)
- Form data (if editable)
- Previous approval data

### Approve Document
```
POST /api/manager/review/employees/{employee_id}/documents/{document_type}/approve
```
Body:
```json
{
  "form_data": { /* edited fields */ },
  "signature": "base64_signature_image",
  "notes": "Optional manager notes"
}
```

### Reject Document
```
POST /api/manager/review/employees/{employee_id}/documents/{document_type}/reject
```
Body:
```json
{
  "reason": "Reason for rejection"
}
```

## Email Notifications

### Trigger Points:
1. **Employee completes onboarding** → Email to manager
2. **Manager approves all documents** → Email to HR + Employee
3. **Manager rejects document** → Email to employee with reason

## Frontend Components

### ManagerReviewInterface
- Main review interface
- OTP modal for session start
- Document workflow stepper
- Side-by-side document viewer
- Edit mode for form fields
- Signature capture

### DocumentWorkflowStepper
- Visual progress indicator
- Shows current step
- Indicates completed/pending documents

### DocumentReviewModal
- Full-screen document viewer
- PDF viewer for forms
- Image viewer for uploads
- Edit controls
- Signature pad

## Security

- OTP verification required to start session
- Session token validated on every API call
- Manager can only review employees in their property
- All actions logged in audit trail
- Signatures include timestamp, IP, user agent

## Next Steps

1. ✅ Remove timer - session persists in sessionStorage
2. ✅ Define sequential workflow
3. 🔄 Implement document replacement logic
4. 🔄 Add side-by-side document comparison
5. 🔄 Implement signature capture and embedding
6. 🔄 Add email notifications
7. 🔄 Test complete workflow end-to-end

