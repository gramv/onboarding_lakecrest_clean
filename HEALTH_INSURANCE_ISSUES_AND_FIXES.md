# Health Insurance PDF Loading Issue - Root Cause Analysis & Fixes

## Issue Report
**Problem:** Health Insurance PDF continuously restarting/not loading  
**Root Cause:** Personal info not being passed from HealthInsuranceStep to ReviewAndSign component  
**Impact:** PDF generation fails because backend can't find required personal info fields

---

## Root Cause Analysis

### Issue #1: Missing Personal Info in formData

**Location:** `frontend/hotel-onboarding-frontend/src/pages/onboarding/HealthInsuranceStep.tsx`

**Problem:**
```typescript
// Line 242 - formData passed to ReviewAndSign
<ReviewAndSign
  formType="health_insurance"
  formTitle="Health Insurance Enrollment Form"
  formData={formData}  // ❌ formData only contains health insurance fields, NO personalInfo
  ...
/>
```

**What formData contains:**
- `medicalPlan`, `medicalTier`, `dentalCoverage`, etc.
- ❌ **MISSING:** `personalInfo` object with SSN, DOB, address, etc.

**What backend expects:**
```python
# backend/app/main_enhanced.py line 13418
personal_info = employee_data.get('personalInfo', {})
if not personal_info or not personal_info.get('ssn') or not personal_info.get('dateOfBirth'):
    # Tries to fetch from database as fallback
```

**Why it fails:**
1. Frontend doesn't load personal info from `personal-info` step
2. `formData` passed to ReviewAndSign has no `personalInfo` field
3. Backend receives empty `personalInfo`
4. Backend tries to fetch from database but may not find it
5. PDF generation fails or restarts continuously

---

### Issue #2: No Rehydration of Personal Info

**Problem:** Unlike I-9 and W-4 steps, Health Insurance doesn't load personal info on mount

**Comparison:**

**I-9 Step (CORRECT):**
```typescript
// I-9 includes all personal info in formData
formData={formData}  // Contains citizenship_status, employee_first_name, etc.
```

**W-4 Step (CORRECT):**
```typescript
// W-4 includes personal info in form
formData={formData}  // Contains first_name, last_name, ssn, address, etc.
```

**Health Insurance (INCORRECT):**
```typescript
// Health Insurance only has plan selections
formData={formData}  // Only medicalPlan, dentalCoverage, etc. - NO personalInfo
```

---

### Issue #3: Backend Fallback Not Reliable

**Location:** `backend/app/main_enhanced.py` lines 13417-13441

**Current Logic:**
```python
# If personal info is incomplete or missing, fetch from personal-info step
personal_info = employee_data.get('personalInfo', {})
if not personal_info or not personal_info.get('ssn') or not personal_info.get('dateOfBirth'):
    saved_personal_info = await supabase_service.get_onboarding_step_data(employee_id, "personal-info")
    # ... merge logic
```

**Problems:**
1. Relies on database query during PDF generation (slow)
2. May not find data if personal-info step not completed yet
3. Adds unnecessary complexity
4. Not consistent with I-9/W-4 pattern

---

## Fixes Required

### Fix #1: Load Personal Info on Mount

**File:** `frontend/hotel-onboarding-frontend/src/pages/onboarding/HealthInsuranceStep.tsx`

**Add personal info loading:**
```typescript
// After line 52 - Load existing data
useEffect(() => {
  console.log('HealthInsuranceStep - Loading data for step:', currentStep.id)
  
  // Load health insurance data
  const savedData = sessionStorage.getItem(`onboarding_${currentStep.id}_data`)
  if (savedData) {
    // ... existing logic
  }
  
  // ✅ NEW: Load personal info from personal-info step
  const personalInfoData = sessionStorage.getItem('onboarding_personal-info_data')
  if (personalInfoData) {
    try {
      const parsed = JSON.parse(personalInfoData)
      const personalInfo = parsed.personalInfo || parsed.formData?.personalInfo || {}
      
      // Merge personal info into formData
      setFormData(prev => ({
        ...prev,
        personalInfo: personalInfo
      }))
      
      console.log('✅ Loaded personal info for health insurance:', {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        hasSSN: !!personalInfo.ssn
      })
    } catch (e) {
      console.error('Failed to parse personal info:', e)
    }
  }
  
  if (progress.completedSteps.includes(currentStep.id)) {
    setIsSigned(true)
    setIsValid(true)
  }
}, [currentStep.id, progress.completedSteps])
```

---

### Fix #2: Pass Personal Info to ReviewAndSign

**File:** `frontend/hotel-onboarding-frontend/src/pages/onboarding/HealthInsuranceStep.tsx`

**Update ReviewAndSign call (line 239):**
```typescript
<ReviewAndSign
  formType="health_insurance"
  formTitle="Health Insurance Enrollment Form"
  formData={{
    ...formData,
    personalInfo: formData.personalInfo || {}  // ✅ Ensure personalInfo is included
  }}
  documentName="Health Insurance Enrollment"
  signerName={employee?.firstName + ' ' + employee?.lastName || 'Employee'}
  signerTitle={employee?.position}
  onSign={handleDigitalSignature}
  onEdit={handleBackFromReview}
  acknowledgments={[
    t.acknowledgments.planSelection,
    t.acknowledgments.dependentInfo,
    t.acknowledgments.coverage,
    t.acknowledgments.changes
  ]}
  language={language}
  description={t.reviewDescription}
  usePDFPreview={true}
  pdfEndpoint={`${getApiUrl()}/onboarding/${employee?.id || 'test-employee'}/health-insurance/generate-pdf`}
/>
```

---

### Fix #3: Ensure Personal Info Persists on Save

**File:** `frontend/hotel-onboarding-frontend/src/pages/onboarding/HealthInsuranceStep.tsx`

**Update handleFormSave (line 90):**
```typescript
const handleFormSave = async (data: any) => {
  console.log('HealthInsuranceStep - handleFormSave called with data:', data)
  
  // Validate the form data
  const validation = await validate(data)
  console.log('Validation result:', validation)
  
  if (validation.valid) {
    console.log('Validation passed, saving data and showing review')
    
    // ✅ Merge with existing formData to preserve personalInfo
    const completeData = {
      ...formData,  // Preserve personalInfo
      ...data       // Add/update health insurance fields
    }
    
    setFormData(completeData)
    setIsValid(true)
    setShowReview(true)
    
    // Save to session storage
    sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify({
      formData: completeData,  // ✅ Save complete data including personalInfo
      isValid: true,
      isSigned: false,
      showReview: true
    }))
  } else {
    console.log('Validation failed:', validation.errors)
  }
}
```

---

### Fix #4: Update handleDigitalSignature

**File:** `frontend/hotel-onboarding-frontend/src/pages/onboarding/HealthInsuranceStep.tsx`

**Update handleDigitalSignature (line 118):**
```typescript
const handleDigitalSignature = async (signatureData: any) => {
  setIsSigned(true)
  
  // ✅ Ensure personalInfo is included in complete data
  const completeData = {
    ...formData,  // Includes personalInfo
    signed: true,
    isSigned: true,
    signatureData,
    completedAt: new Date().toISOString()
  }
  
  // Save to backend if we have an employee ID
  if (employee?.id) {
    try {
      await axios.post(`${getApiUrl()}/onboarding/${employee.id}/health-insurance`, completeData)
      console.log('Health insurance data saved to backend')
    } catch (error) {
      console.error('Failed to save health insurance data to backend:', error)
    }
  }
  
  // Save to session storage with signed status
  sessionStorage.setItem(`onboarding_${currentStep.id}_data`, JSON.stringify({
    formData: completeData,  // ✅ Complete data with personalInfo
    isValid: true,
    isSigned: true,
    showReview: false,
    signed: true,
    signatureData,
    completedAt: completeData.completedAt
  }))
  
  await saveProgress(currentStep.id, completeData)
  await markStepComplete(currentStep.id, completeData)
  setShowReview(false)
}
```

---

## Rehydration Verification

### Check #1: Human Trafficking Rehydration

**Status:** ✅ WORKING (uses certificate data, doesn't need personal info)

### Check #2: Weapons Policy Rehydration

**Status:** ✅ WORKING (uses certificate data, doesn't need personal info)

### Check #3: Health Insurance Rehydration

**Status:** ❌ BROKEN - Needs fixes above

**Test:**
1. Complete personal-info step
2. Complete health-insurance step
3. Refresh page
4. Navigate back to health-insurance step
5. **Expected:** Form data + personal info loaded
6. **Actual:** Only form data loaded, personal info missing

---

## Storage Standards Comparison

### I-9 Storage Pattern
```typescript
sessionStorage: {
  'onboarding_i9-section1_data': {
    formData: {
      employee_first_name: "John",
      employee_last_name: "Doe",
      ssn: "123-45-6789",
      // ... all personal fields
    }
  }
}
```

### W-4 Storage Pattern
```typescript
sessionStorage: {
  'onboarding_w4-form_data': {
    formData: {
      first_name: "John",
      last_name: "Doe",
      ssn: "123-45-6789",
      address: "123 Main St",
      // ... all personal fields
    }
  }
}
```

### Health Insurance Storage Pattern (CURRENT - BROKEN)
```typescript
sessionStorage: {
  'onboarding_health-insurance_data': {
    formData: {
      medicalPlan: "hra_6k",
      dentalCoverage: true,
      // ❌ NO personalInfo field
    }
  }
}
```

### Health Insurance Storage Pattern (FIXED)
```typescript
sessionStorage: {
  'onboarding_health-insurance_data': {
    formData: {
      personalInfo: {  // ✅ Added
        firstName: "John",
        lastName: "Doe",
        ssn: "123-45-6789",
        dateOfBirth: "1990-01-01",
        address: "123 Main St",
        // ... all personal fields
      },
      medicalPlan: "hra_6k",
      dentalCoverage: true,
      // ... health insurance fields
    }
  }
}
```

---

## Summary

### Issues Found:
1. ❌ Personal info not loaded from personal-info step
2. ❌ Personal info not passed to ReviewAndSign
3. ❌ Personal info not persisted in session storage
4. ❌ Rehydration doesn't restore personal info

### Fixes Required:
1. ✅ Load personal info on mount from personal-info step
2. ✅ Pass personal info to ReviewAndSign component
3. ✅ Preserve personal info in handleFormSave
4. ✅ Include personal info in handleDigitalSignature

### Testing Checklist:
- [ ] Load health insurance step - verify personal info loaded
- [ ] Fill health insurance form - verify personal info preserved
- [ ] Review PDF - verify personal info appears in PDF
- [ ] Sign document - verify personal info saved
- [ ] Refresh page - verify rehydration works
- [ ] Navigate away and back - verify data persists

---

## Next Steps

1. Apply fixes to HealthInsuranceStep.tsx
2. Test PDF generation with personal info
3. Verify rehydration works correctly
4. Compare with I-9/W-4 patterns for consistency
5. Update documentation

