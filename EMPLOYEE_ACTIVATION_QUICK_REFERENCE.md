# Employee Activation Workflow - Quick Reference Guide

## Overview

Employees only appear in the **Employees** section after completing this workflow:

```
Employee Invited → Completes Onboarding → Manager Reviews → Manager Approves → Employee Activated
```

---

## API Endpoints

### 1. Get Active Employees (Main Employee List)
```http
GET /api/employees
Authorization: Bearer {token}
```

**Query Parameters:**
- `property_id` (optional): Filter by property
- `department` (optional): Filter by department
- `status` (optional): Filter by employment status
- `search` (optional): Search query
- `include_pending` (optional, HR only): Include non-active employees

**Default Behavior:**
- ✅ Returns only `employment_status='active'` employees
- ❌ Filters out invited, pending, in-progress employees

**Response:**
```json
[
  {
    "id": "uuid",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "employment_status": "active",
    "onboarding_status": "completed",
    "manager_review_status": "completed",
    ...
  }
]
```

### 2. Get Employees Pending Review
```http
GET /api/employees/pending-review
Authorization: Bearer {token}
```

**Access:** Managers and HR only

**Returns:** Employees who have:
- Completed onboarding (`onboarding_status='completed'`)
- Awaiting manager review (`manager_review_status='pending_review'`)
- NOT yet activated (`employment_status != 'active'`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "first_name": "Jane",
      "last_name": "Smith",
      "onboarding_completed_at": "2025-10-12T10:30:00Z",
      "i9_section2_deadline": "2025-10-15",
      "days_pending": 2,
      ...
    }
  ],
  "message": "Found 5 employees pending review"
}
```

### 3. Complete Manager Review (Activate Employee)
```http
POST /api/manager/review/{employee_id}/complete-review
Authorization: Bearer {token}
Content-Type: application/json

{
  "startDate": "2025-10-15",
  "startTime": "9:00 AM",
  "employeeNumber": "EMP-12345",
  "notes": "Welcome to the team!"
}
```

**What This Does:**
1. Verifies all documents are approved
2. Updates employee status:
   - `employment_status` → `'active'`
   - `onboarding_status` → `'completed'`
   - `manager_review_status` → `'completed'`
3. Sends welcome email to employee
4. Employee now appears in Employees tab

---

## Employee Status Fields

### employment_status
- `'invited'` - Employee invited, not yet started
- `'pending'` - Onboarding in progress
- `'active'` - ✅ **Activated by manager** (shown in Employees tab)
- `'terminated'` - No longer employed

### onboarding_status
- `'not_started'` - Hasn't begun onboarding
- `'in_progress'` - Currently completing forms
- `'completed'` - ✅ All forms submitted
- `'expired'` - Onboarding link expired

### manager_review_status
- `'pending_review'` - Awaiting manager action
- `'manager_reviewing'` - Manager currently reviewing
- `'completed'` - ✅ Manager approved
- `'changes_requested'` - Manager requested changes
- `'rejected'` - Manager rejected

---

## Frontend Components

### EmployeesTab
**File:** `frontend/hotel-onboarding-frontend/src/components/dashboard/EmployeesTab.tsx`

**Purpose:** Display active employees

**Data Source:**
```typescript
const response = await apiClient.get('/employees', {
  headers: { Authorization: `Bearer ${token}` }
})
```

**Displays:** Only employees with `employment_status='active'`

### PendingReviewsTab
**File:** `frontend/hotel-onboarding-frontend/src/components/dashboard/PendingReviewsTab.tsx`

**Purpose:** Show employees awaiting manager review

**Data Source:**
```typescript
const response = await managerReviewApi.getPendingReviews()
```

**Displays:** Employees who completed onboarding but not yet activated

### EmployeeDetailsView
**File:** `frontend/hotel-onboarding-frontend/src/components/dashboard/EmployeeDetailsView.tsx`

**Purpose:** Comprehensive employee information

**Features:**
- Personal information (decrypted)
- Employment details
- Emergency contacts
- All completed documents
- Download functionality

---

## Common Scenarios

### Scenario 1: New Employee Onboarding
```
1. HR invites employee
   └─ employment_status: 'invited'
   └─ onboarding_status: 'not_started'

2. Employee completes onboarding
   └─ employment_status: 'invited'
   └─ onboarding_status: 'completed'
   └─ manager_review_status: 'pending_review'
   └─ Appears in: Pending Reviews Tab

3. Manager reviews and approves
   └─ employment_status: 'active' ✅
   └─ manager_review_status: 'completed'
   └─ Appears in: Employees Tab
```

### Scenario 2: Checking Employee Status
```typescript
// Check if employee should be visible in Employees tab
const isActive = employee.employment_status === 'active'

// Check if employee needs manager review
const needsReview = 
  employee.onboarding_status === 'completed' &&
  employee.manager_review_status === 'pending_review' &&
  employee.employment_status !== 'active'
```

### Scenario 3: Manager Review Workflow
```typescript
// 1. Get employees pending review
const pending = await apiClient.get('/employees/pending-review')

// 2. Manager reviews documents
// (UI shows all documents, manager approves each)

// 3. Complete review and activate
await apiClient.post(`/manager/review/${employeeId}/complete-review`, {
  startDate: '2025-10-15',
  startTime: '9:00 AM',
  employeeNumber: 'EMP-12345'
})

// 4. Employee now appears in Employees tab
```

---

## Database Queries

### Get Active Employees
```sql
SELECT * FROM employees 
WHERE employment_status = 'active'
ORDER BY created_at DESC;
```

### Get Employees Pending Review
```sql
SELECT * FROM employees 
WHERE onboarding_status = 'completed'
  AND manager_review_status = 'pending_review'
  AND employment_status != 'active'
ORDER BY onboarding_completed_at ASC;
```

### Get Employee Documents
```sql
SELECT * FROM signed_documents 
WHERE employee_id = 'uuid'
ORDER BY signed_at DESC;
```

---

## Testing

### Run Test Suite
```bash
cd backend
export $(cat .env | grep -v '^#' | xargs)
python3 test_employee_activation_workflow.py
```

### Manual Testing

**1. Test Employee List Filtering:**
```bash
# Should return only active employees
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/employees | jq '.[] | .employment_status' | sort | uniq
```

**2. Test Pending Reviews:**
```bash
# Should return employees awaiting review
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/employees/pending-review | jq '.data | length'
```

**3. Test Employee Activation:**
```bash
# Complete manager review
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2025-10-15","startTime":"9:00 AM","employeeNumber":"EMP-12345"}' \
  http://localhost:8000/api/manager/review/{employee_id}/complete-review
```

---

## Troubleshooting

### Issue: Employee not showing in Employees tab

**Check:**
1. Is `employment_status = 'active'`?
   ```sql
   SELECT employment_status FROM employees WHERE id = 'uuid';
   ```

2. Has manager completed review?
   ```sql
   SELECT manager_review_status FROM employees WHERE id = 'uuid';
   ```

3. Is onboarding completed?
   ```sql
   SELECT onboarding_status FROM employees WHERE id = 'uuid';
   ```

**Fix:**
- Employee must have `employment_status='active'`
- This is set when manager clicks "Complete Onboarding"

### Issue: Employee showing in Employees tab prematurely

**This should NOT happen with the fix**, but if it does:

**Check backend filtering:**
```python
# In /api/employees endpoint
if not include_pending or current_user.role != "hr":
    employees = [emp for emp in employees if emp.employment_status == 'active']
```

**Check frontend:**
```typescript
// In EmployeesTab.tsx
const response = await apiClient.get('/employees', {
  headers: { Authorization: `Bearer ${token}` }
})
// Should only receive active employees
```

### Issue: Documents not accessible

**Check:**
1. Are documents in `signed_documents` table?
2. Is manager authorized for this property?
3. Are PDFs properly encoded (base64)?

**Endpoint:**
```
GET /api/manager/review/employees/{employee_id}/completed-documents
```

---

## Key Files

### Backend
- `backend/app/main_enhanced.py` - Main API endpoints
- `backend/app/manager_review_api.py` - Manager review endpoints
- `backend/app/routers/manager_document_approval_router.py` - Document approval
- `backend/test_employee_activation_workflow.py` - Test suite

### Frontend
- `frontend/hotel-onboarding-frontend/src/components/dashboard/EmployeesTab.tsx`
- `frontend/hotel-onboarding-frontend/src/components/dashboard/PendingReviewsTab.tsx`
- `frontend/hotel-onboarding-frontend/src/components/dashboard/EmployeeDetailsView.tsx`
- `frontend/hotel-onboarding-frontend/src/components/dashboard/DocumentsViewer.tsx`
- `frontend/hotel-onboarding-frontend/src/services/managerReviewApi.ts`

---

## Summary

✅ **Employees appear in Employees tab ONLY when:**
- `employment_status = 'active'`
- Manager has completed review
- All documents approved

✅ **Employees appear in Pending Reviews tab when:**
- `onboarding_status = 'completed'`
- `manager_review_status = 'pending_review'`
- `employment_status != 'active'`

✅ **Backend automatically filters:**
- `/api/employees` returns only active employees
- `/api/employees/pending-review` returns only pending reviews

✅ **Frontend displays:**
- EmployeesTab: Active employees only
- PendingReviewsTab: Employees awaiting review
- EmployeeDetailsView: Full details with documents

---

**Last Updated:** October 12, 2025  
**Version:** 1.0

