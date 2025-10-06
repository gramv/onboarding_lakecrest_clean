# Health Insurance Manager Approval - Implementation Plan

## 🎯 **Overview**

Manager needs to fill employer/HR section at the top of the Health Insurance form before approving.

---

## 📋 **Fields to Fill**

### **Employer Section (Top of Form):**

1. **Effective Date** ✅ Already filled by employee
2. **Deadline to Submit** ❌ Manager must fill
3. **Property Name** ❌ Manager must fill
4. **Reason for Request** ❌ Manager must check one:
   - ☑ New Hire – Date of Hire: _____________
   - ☐ Open Enrollment
   - ☐ Qualifying Event – If so, state event & date: ___________________________

---

## 🏗️ **Implementation Plan**

### **1. Backend: Health Insurance Detail Endpoint**

**Endpoint:** `GET /api/manager/review/employees/{id}/documents/health_insurance/detail`

**Returns:**
```json
{
  "pdfUrl": "https://...",
  "employeeData": {
    "name": "Goutham Vemula",
    "startDate": "2025-10-05",
    "coverageSelections": {
      "medical": "I Decline Medical Coverage",
      "dental": "I Decline Dental Coverage",
      "vision": "I Decline Vision Coverage"
    }
  },
  "employerProfile": {
    "property_name": "m6",
    "business_legal_name": "rci"
  },
  "autoFillData": {
    "propertyName": "m6",
    "deadlineToSubmit": "2025-11-04",  // 30 days from hire
    "reasonForRequest": "new_hire",
    "dateOfHire": "2025-10-05"
  }
}
```

---

### **2. Backend: Health Insurance Complete Endpoint**

**Endpoint:** `POST /api/manager/review/employees/{id}/documents/health_insurance/complete`

**Request:**
```json
{
  "propertyName": "m6",
  "deadlineToSubmit": "2025-11-04",
  "reasonForRequest": "new_hire",  // or "open_enrollment" or "qualifying_event"
  "dateOfHire": "2025-10-05",
  "qualifyingEventDescription": null,  // Only if reasonForRequest = "qualifying_event"
  "notes": "Optional manager notes"
}
```

**Process:**
1. Load employee's signed Health Insurance PDF
2. Fill employer section fields:
   - `Deadline to Submit` field
   - `Property Name` field
   - Check appropriate checkbox for `Reason for Request`
   - Fill `New Hire – Date of Hire` field
3. Save completed PDF using `save_signed_document()`
4. Create `document_approvals` record with `status='approved'`
5. Return success

---

### **3. Frontend: HealthInsuranceReviewModal Component**

**Location:** `frontend/src/components/manager/health_insurance/HealthInsuranceReviewModal.tsx`

**UI Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Health Insurance Approval                            [X]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────┐  ┌─────────────────────────────┐  │
│ │                     │  │ Employee Coverage Summary   │  │
│ │                     │  │                             │  │
│ │  Health Insurance   │  │ Medical: Declined           │  │
│ │  PDF Viewer         │  │ Dental: Declined            │  │
│ │                     │  │ Vision: Declined            │  │
│ │  (Shows employee's  │  │                             │  │
│ │   selections)       │  │ ─────────────────────────── │  │
│ │                     │  │                             │  │
│ │                     │  │ Employer Information        │  │
│ │                     │  │                             │  │
│ │                     │  │ Property Name:              │  │
│ │                     │  │ [m6                    ]    │  │
│ │                     │  │                             │  │
│ │                     │  │ Deadline to Submit:         │  │
│ │                     │  │ [11/04/2025            ]    │  │
│ │                     │  │                             │  │
│ │                     │  │ Reason for Request:         │  │
│ │                     │  │ ☑ New Hire                  │  │
│ │                     │  │   Date of Hire: 10/05/2025  │  │
│ │                     │  │ ☐ Open Enrollment           │  │
│ │                     │  │ ☐ Qualifying Event          │  │
│ │                     │  │                             │  │
│ └─────────────────────┘  └─────────────────────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Notes (Optional):                                           │
│ [                                                      ]    │
│                                                             │
│                    [Cancel] [Approve Health Insurance ✓]   │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Auto-fills property name from employer profile
- Auto-calculates deadline (30 days from hire date)
- Auto-selects "New Hire" and fills date of hire
- Shows employee's coverage selections summary
- Manager can add optional notes
- Click "Approve" to complete

---

### **4. PDF Field Mapping**

**Health Insurance Form Fields:**

```python
HEALTH_INSURANCE_FIELDS = {
    # Employer Section (Manager fills)
    "effective_date": "Effective Date",
    "deadline_to_submit": "Deadline to Submit",
    "property_name": "Property Name",
    "reason_for_request": "Reason for Request check one of the following",
    "new_hire_date": "New Hire  Date of Hire",
    "open_enrollment": "Open Enrollment",
    "qualifying_event": "Qualifying Event  If so state event  date",
    
    # Employee Section (Already filled)
    "employee_name": "Employees Name Last First MI",
    "ssn": "Social Security",
    "birth_date": "Birth Date",
    # ... (all other employee fields)
}
```

**Fill Logic:**
```python
def fill_health_insurance_employer_section(pdf_bytes, employer_data):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page = doc[0]
    
    # Fill employer fields
    for widget in page.widgets():
        if widget.field_name == "Deadline to Submit":
            widget.field_value = employer_data['deadline_to_submit']
            widget.update()
        elif widget.field_name == "Property Name":
            widget.field_value = employer_data['property_name']
            widget.update()
        elif widget.field_name == "New Hire  Date of Hire":
            if employer_data['reason_for_request'] == 'new_hire':
                widget.field_value = employer_data['date_of_hire']
                widget.update()
        # ... etc
    
    return doc.tobytes()
```

---

## 🔄 **Workflow**

1. **Manager clicks "Health Insurance" in stepper**
2. **HealthInsuranceReviewModal opens**
   - Loads PDF and employee data
   - Auto-fills employer section
3. **Manager reviews:**
   - Employee's coverage selections
   - Auto-filled employer information
4. **Manager clicks "Approve"**
   - Backend fills employer section in PDF
   - Saves completed PDF
   - Creates approval record
   - Workflow progresses to next step

---

## 📝 **Files to Create/Modify**

### **Backend:**
1. ✅ Add endpoint: `GET /employees/{id}/documents/health_insurance/detail`
2. ✅ Add endpoint: `POST /employees/{id}/documents/health_insurance/complete`
3. ✅ Add PDF filler: `fill_health_insurance_employer_section()` in `pdf_forms.py`

### **Frontend:**
1. ✅ Create: `HealthInsuranceReviewModal.tsx`
2. ✅ Update: `ManagerReviewInterface.tsx` to handle health_insurance
3. ✅ Add service: `getHealthInsuranceDetail()` and `completeHealthInsurance()` in `managerReviewService.ts`

---

## 🎯 **Success Criteria**

- ✅ Manager can view employee's Health Insurance selections
- ✅ Employer section auto-fills with property name, deadline, and hire date
- ✅ Manager can approve with one click
- ✅ Completed PDF has all employer fields filled
- ✅ Workflow progresses to next step (Company Policies)

---

## 🚀 **Next Steps**

1. Implement backend endpoints
2. Create HealthInsuranceReviewModal component
3. Test approval flow
4. Verify PDF fields are filled correctly

---

## 📊 **Deadline Calculation Logic**

```python
def calculate_health_insurance_deadline(hire_date: str) -> str:
    """
    Calculate deadline to submit health insurance enrollment.
    Typically 30 days from hire date.
    """
    from datetime import datetime, timedelta
    
    hire_dt = datetime.strptime(hire_date, '%Y-%m-%d')
    deadline_dt = hire_dt + timedelta(days=30)
    
    return deadline_dt.strftime('%m/%d/%Y')
```

---

## ✅ **Ready to Implement!**

This plan provides a complete implementation guide for Health Insurance manager approval, following the same patterns as I-9 and W-4.

