# Single-Step Direct Deposit SSN Fix

## Problem Summary

When HR sends a single-step Direct Deposit invitation to a new employee (not in the system), the employee fills out the PersonalInfoModal which collects their SSN. However, the SSN was not appearing on the generated Direct Deposit PDF.

## Root Cause Analysis

### Data Flow Issue

1. **PersonalInfoModal Submission** (✅ Working):
   - User fills out modal with firstName, lastName, email, phone, SSN
   - Frontend sends data to `/api/onboarding/single-step/collect-info`
   - Backend stores data in `onboarding_form_data` table with step_id `'temp-personal-info'`
   - Backend returns success

2. **Session Update** (✅ Working):
   - Frontend updates `session.employee` with firstName, lastName, email, phone
   - **BUT**: SSN was NOT saved to secureStorage

3. **DirectDepositStep SSN Retrieval** (❌ Broken):
   - DirectDepositStep tries to retrieve SSN from secureStorage (lines 337-398)
   - Checks these locations:
     - `personal-info_data` (from PersonalInfoStep)
     - `i9-section1_data` (from I9Section1Step)
     - `i9-complete_data` (from I9CompleteStep)
   - **None of these exist in single-step mode!**
   - `ssnFromI9` remains empty string

4. **PDF Generation** (❌ Missing SSN):
   - DirectDepositStep creates `pdfPayload` with:
     ```typescript
     ssn: ssnFromI9 || extraPdfData?.ssn || (formData as any)?.ssn || ''
     ```
   - All sources are empty, so SSN = ''
   - PDF is generated without SSN

### Code References

**DirectDepositStep.tsx (lines 337-398):**
```typescript
React.useEffect(() => {
  console.log('DirectDepositStep - Starting SSN retrieval...')
  try {
    // First try PersonalInfoStep data (encrypted storage - where SSN is actually saved)
    const personalInfoData = secureStorage.getItem('personal-info_data')
    console.log('DirectDepositStep - Personal info data exists:', !!personalInfoData)

    if (personalInfoData) {
      const parsedData = personalInfoData // secureStorage already returns parsed data
      console.log('DirectDepositStep - Parsed personal info structure:', Object.keys(parsedData))

      // SSN can be at parsedData.personalInfo.ssn or parsedData.ssn
      const personalInfo = parsedData.personalInfo || parsedData
      const ssn = personalInfo?.ssn || ''

      console.log('DirectDepositStep - Personal info parsed SSN:', ssn ? '****' + ssn.slice(-4) : 'NOT FOUND')
      if (ssn) {
        console.log('DirectDepositStep - ✅ Retrieved SSN from PersonalInfo data')
        setSsnFromI9(ssn)
        return
      }
    }
    // ... fallback checks for I9 data
  } catch (e) {
    console.error('Failed to retrieve SSN from session data:', e)
  }
}, [])
```

**OnboardingFlowPortal.tsx (lines 363-428 - BEFORE FIX):**
```typescript
const handlePersonalInfoSubmit = useCallback(async (personalInfo: any) => {
  // ... API call to backend
  
  if (personalInfoData && session) {
    const employeeData = {
      ...session.employee,
      firstName: personalInfoData.firstName,
      lastName: personalInfoData.lastName,
      email: personalInfoData.email,
      phone: personalInfoData.phone,
      // SSN is stored separately, will be retrieved by DirectDepositStep
    }
    
    setSession({
      ...session,
      employee: employeeData
    })
  }
  // ❌ SSN was never saved to secureStorage!
}, [token, session])
```

## Solution

### Fix Applied

Modified `OnboardingFlowPortal.tsx` to save the SSN to secureStorage after successful backend submission:

```typescript
// ✅ FIX: Save SSN to secureStorage so DirectDepositStep can retrieve it
// DirectDepositStep looks for SSN in 'personal-info_data', so we save it there
try {
  const { secureStorage } = await import('@/services/SecureStorageService')
  const singleStepPersonalInfo = {
    personalInfo: {
      firstName: personalInfoData.firstName,
      lastName: personalInfoData.lastName,
      email: personalInfoData.email,
      phone: personalInfoData.phone,
      ssn: personalInfoData.ssn // Keep the SSN for DirectDepositStep
    }
  }
  secureStorage.setItem('personal-info_data', singleStepPersonalInfo)
  console.log('✅ Saved personal info (including SSN) to secureStorage for DirectDepositStep')
} catch (storageError) {
  console.error('⚠️ Failed to save to secureStorage:', storageError)
  // Don't fail the whole operation if storage fails
}
```

### Why This Works

1. **Matches DirectDepositStep's Expectations**:
   - DirectDepositStep first checks `secureStorage.getItem('personal-info_data')`
   - We save the data with the exact structure it expects: `{ personalInfo: { ssn: '...' } }`

2. **Encrypted Storage**:
   - Uses `secureStorage` (encrypted) instead of plain sessionStorage
   - Matches the security pattern used by PersonalInfoStep and I9Section1Step

3. **Graceful Degradation**:
   - Wrapped in try-catch so storage failures don't break the flow
   - SSN is still saved to backend database as backup

4. **No Changes to DirectDepositStep**:
   - Existing SSN retrieval logic works without modification
   - Maintains compatibility with regular onboarding flow

## Testing Checklist

### Single-Step Direct Deposit Flow

- [ ] HR sends single-step Direct Deposit invitation to new employee
- [ ] Employee opens link, sees PersonalInfoModal
- [ ] Employee fills out all fields including SSN (e.g., 123-45-6789)
- [ ] Modal submits successfully
- [ ] DirectDepositStep loads with employee name/email pre-filled
- [ ] Employee completes bank account information
- [ ] Employee proceeds to Review & Sign
- [ ] PDF preview shows SSN in the correct field
- [ ] Employee signs the form
- [ ] Final PDF includes SSN
- [ ] PDF is saved to database
- [ ] HR receives notification with PDF attachment

### Regular Onboarding Flow (Regression Test)

- [ ] Employee goes through regular onboarding
- [ ] Completes PersonalInfoStep with SSN
- [ ] Later reaches DirectDepositStep
- [ ] SSN is retrieved from PersonalInfoStep data
- [ ] PDF generates with SSN correctly

### I9-First Flow (Regression Test)

- [ ] Employee completes I9Section1Step with SSN
- [ ] Later reaches DirectDepositStep
- [ ] SSN is retrieved from I9 data
- [ ] PDF generates with SSN correctly

## Files Modified

1. **frontend/hotel-onboarding-frontend/src/pages/OnboardingFlowPortal.tsx**
   - Lines 363-448: Modified `handlePersonalInfoSubmit` to save SSN to secureStorage

## Security Considerations

- ✅ SSN is stored in encrypted secureStorage (not plain sessionStorage)
- ✅ SSN is only stored client-side temporarily during the session
- ✅ SSN is sent to backend over HTTPS
- ✅ Backend stores SSN with field-level encryption
- ✅ SSN is cleared from secureStorage when session ends
- ✅ Follows same security pattern as PersonalInfoStep and I9Section1Step

## Deployment Notes

1. **Frontend Build Required**:
   ```bash
   cd frontend/hotel-onboarding-frontend
   npm run build
   ```

2. **No Backend Changes**:
   - Backend already handles SSN storage correctly
   - No database migrations needed

3. **No Breaking Changes**:
   - Fix is additive (adds data to secureStorage)
   - Doesn't modify existing flows
   - Backward compatible

## Related Documentation

- `SINGLE_STEP_MODAL_IMPLEMENTATION.md` - Original single-step modal implementation
- `frontend/hotel-onboarding-frontend/src/pages/onboarding/DirectDepositStep.tsx` - SSN retrieval logic
- `frontend/hotel-onboarding-frontend/src/components/modals/PersonalInfoModal.tsx` - Modal component
- `backend/app/main_enhanced.py` (lines 20023-20106) - Backend collect-info endpoint

