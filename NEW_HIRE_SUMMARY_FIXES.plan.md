# Fix New Hire Summary PDF Issues

## Overview
Fix critical bugs and data display issues in the New Hire Summary PDF generation and approval process.

## Problems Identified

### 1. Backend Error: `email_sent` Variable Not Defined ❌
**Location**: `backend/app/routers/manager_document_approval_router.py` line 3151  
**Error**: `NameError: name 'email_sent' is not defined`  
**Impact**: Complete Review endpoint fails when trying to activate employee

### 2. Hotel Name Missing in PDF ❌
**Location**: `backend/app/generators/new_hire_summary_pdf.py` line 146  
**Issue**: PDF shows "-" for Hotel Name, only address is populated  
**Root Cause**: Backend passes `hotelName` separately but it may be empty

### 3. Pay Frequency Missing (Shows "-") ❌
**Location**: `backend/app/generators/new_hire_summary_pdf.py` lines 198, 217  
**Issue**: Pay Frequency shows "-" in both sections  
**Root Cause**: `payFrequency` field not being passed or formatted correctly

### 4. Pay Frequency Duplicated ⚠️
**Location**: `backend/app/generators/new_hire_summary_pdf.py` lines 198, 217  
**Issue**: Pay Frequency appears in both "Employee Information" and "Role & Compensation"  
**UX Issue**: Redundant information

### 5. Insurance Cost Labels Incorrect ⚠️
**Location**: `backend/app/generators/new_hire_summary_pdf.py` lines 243, 254, 262, 269  
**Issue**: All costs labeled as "bi-weekly" but should match employee's pay frequency  
**Analysis**: Insurance premiums ARE biweekly by default, but the label should clarify this is the premium cost, not the paycheck deduction

---

## Solutions

### Fix 1: Correct Variable Name in Complete Review Endpoint
**File**: `backend/app/routers/manager_document_approval_router.py`

**Line 3151**: Change `email_sent` to `employee_email_sent`

```python
# Before
"emailSent": email_sent,

# After  
"emailSent": employee_email_sent,
```

**Why**: The variable is defined as `employee_email_sent` on line 3074, but referenced as `email_sent` on line 3151.

---

### Fix 2: Ensure Hotel Name is Populated
**File**: `backend/app/routers/manager_document_approval_router.py`

**Location**: Around line 530-535 in `get_new_hire_summary` endpoint

**Add explicit hotel name extraction**:
```python
# After getting property data
property_name = property_obj.get('name', '') if property_obj else ''

# Ensure hotel name is in summary_defaults
summary_defaults = {
    "hotelName": property_name or summary_data.get('hotelName', ''),  # Explicit hotel name
    "hotelAddress": hotel_address1,
    # ... rest of fields
}
```

**Also check** `approve_new_hire_summary` endpoint (around line 710) to ensure `hotelName` is preserved when approving.

---

### Fix 3: Fix Pay Frequency Display
**File**: `backend/app/routers/manager_document_approval_router.py`

**In `get_new_hire_summary`** (around line 530):
```python
# Ensure payFrequency is properly formatted
pay_frequency = employee.get('pay_frequency', 'bi-weekly')
if pay_frequency:
    # Capitalize first letter for display
    pay_frequency = pay_frequency.replace('_', '-').replace('-', ' ').title()

summary_defaults = {
    # ... other fields
    "payFrequency": pay_frequency,
    # ...
}
```

**In `approve_new_hire_summary`** (around line 745):
```python
pdf_context = {
    # ... existing fields
    "payFrequency": summary_data.get('payFrequency') or 'Bi-Weekly',  # Fallback
    # ...
}
```

---

### Fix 4: Remove Duplicate Pay Frequency
**File**: `backend/app/generators/new_hire_summary_pdf.py`

**Option A - Remove from Employee Information** (Recommended):
```python
# Line 194-199: Remove Pay Frequency from Employee Information section
[
    Paragraph("Dependents", self.label_style),
    Paragraph(summary.get("dependents", "-"), self.value_style),
    Paragraph("", self.label_style),  # Empty cell
    Paragraph("", self.value_style),  # Empty cell
],
```

**Option B - Keep Both** (if business requires):
Keep as-is but ensure value is populated.

**Recommendation**: Remove from Employee Information, keep only in Role & Compensation section since it's employment-related data.

---

### Fix 5: Clarify Insurance Cost Labels
**File**: `backend/app/generators/new_hire_summary_pdf.py`

**Lines 243, 254, 262**: Change labels to be more precise

```python
# Medical Plan (line 243)
cost_text = f"${health_display.get('medical_cost', 0):.2f} per pay period"  # More accurate

# Dental Coverage (line 254)
Paragraph(f"{dental['tier']} - ${dental['cost']:.2f} per pay period", self.value_style)

# Vision Coverage (line 262)
Paragraph(f"{vision['tier']} - ${vision['cost']:.2f} per pay period", self.value_style)

# Total (line 269)
Paragraph("Total Cost Per Pay Period", self.label_style),  # Clearer label
```

**Alternative**: Add a note explaining premium frequency
```python
# After benefits_data table, add a note
benefits_data.append([
    Paragraph("Note", self.label_style),
    Paragraph("Insurance premiums are deducted each pay period. Actual premium costs are based on bi-weekly rates.", 
              self.value_style)
])
```

**Recommendation**: Use "per pay period" for clarity since that's when deductions occur, regardless of the underlying premium structure.

---

## Implementation Order

1. **Critical (Blocks functionality)**:
   - Fix 1: Variable name error (1 line change)
   - Fix 2: Hotel name population (check 2 locations)
   - Fix 3: Pay frequency display (2 locations)

2. **Important (Data accuracy)**:
   - Fix 5: Insurance cost labels (4 locations)

3. **Nice to have (UX improvement)**:
   - Fix 4: Remove duplicate pay frequency (1 section)

---

## Testing Checklist

- [ ] Complete Review endpoint successfully activates employee
- [ ] Manager receives completion email without errors
- [ ] New Hire Summary PDF shows hotel name correctly
- [ ] Pay Frequency displays correctly (not "-")
- [ ] Pay Frequency only appears once (in Role & Compensation)
- [ ] Insurance costs labeled appropriately
- [ ] PDF downloads and opens correctly
- [ ] All employee data displays correctly

---

## Files to Modify

1. `backend/app/routers/manager_document_approval_router.py` (3 changes)
2. `backend/app/generators/new_hire_summary_pdf.py` (2 changes)

**Estimated Time**: 20-30 minutes  
**Risk Level**: Low (isolated changes, well-defined scope)

