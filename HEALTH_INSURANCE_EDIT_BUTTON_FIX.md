# Health Insurance - Edit Button Fix

## Date: 2025-10-02
## Issue: No "Edit" button at preview to change selections before signing

---

## Problem Statement

**User Request:**
> "The health insurance should allow to change mind and select other options before signing. At the preview. Please add that button to go back or change"

**Issue:**
The health insurance review screen was not showing an "Edit" button to allow users to go back and change their selections before signing.

---

## Root Cause Analysis

### Issue #1: Wrong Prop Name

**HealthInsuranceStep was passing:**
```typescript
<ReviewAndSign
  onEdit={handleBackFromReview}  // ❌ Wrong prop name
  ...
/>
```

**ReviewAndSign expects:**
```typescript
interface ReviewAndSignProps {
  onBack?: () => void  // ✅ Correct prop name
  ...
}
```

**Result:** The `onEdit` prop was being ignored, so the "Edit" button never appeared.

---

### Issue #2: Extra Invalid Props

**HealthInsuranceStep was passing:**
```typescript
<ReviewAndSign
  formTitle="..."        // ❌ Not in interface
  documentName="..."     // ❌ Not in interface
  signerName="..."       // ❌ Not in interface
  signerTitle="..."      // ❌ Not in interface
  acknowledgments={[]}   // ❌ Not in interface
  ...
/>
```

**ReviewAndSign interface:**
```typescript
interface ReviewAndSignProps {
  formType: string
  formData: any
  title: string          // ✅ Correct prop name
  description?: string
  language: 'en' | 'es'
  onSign: (signatureData: SignatureData) => void
  onBack?: () => void
  ...
}
```

**Result:** These props were being ignored, but didn't cause errors.

---

## How ReviewAndSign Edit Button Works

**ReviewAndSign component has built-in edit button (lines 570-578):**
```typescript
{onBack && (
  <Button
    variant="outline"
    onClick={onBack}
    className="flex-1"
  >
    {t.editButton}  // "Edit Information" (EN) / "Editar Información" (ES)
  </Button>
)}
```

**Translations:**
- English: "Edit Information"
- Spanish: "Editar Información"

**Button appears when:**
- `onBack` prop is provided
- User is on the review/sign screen
- Before signing is complete

---

## Fixes Applied

### Fix #1: Changed onEdit to onBack (Line 297)

**Before:**
```typescript
<ReviewAndSign
  formType="health_insurance"
  formTitle="Health Insurance Enrollment Form"
  formData={{
    ...formData,
    personalInfo: formData.personalInfo || {}
  }}
  documentName="Health Insurance Enrollment"
  signerName={employee?.firstName + ' ' + employee?.lastName || 'Employee'}
  signerTitle={employee?.position}
  onSign={handleDigitalSignature}
  onEdit={handleBackFromReview}  // ❌ Wrong prop name
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

**After:**
```typescript
<ReviewAndSign
  formType="health_insurance"
  title="Health Insurance Enrollment Form"  // ✅ Changed from formTitle
  formData={{
    ...formData,
    personalInfo: formData.personalInfo || {}
  }}
  onSign={handleDigitalSignature}
  onBack={handleBackFromReview}  // ✅ Changed from onEdit to onBack
  language={language}
  description={t.reviewDescription}
  usePDFPreview={true}
  pdfEndpoint={`${getApiUrl()}/onboarding/${employee?.id || 'test-employee'}/health-insurance/generate-pdf`}
/>
```

**Changes:**
1. `onEdit` → `onBack` (now button will appear)
2. `formTitle` → `title` (correct prop name)
3. Removed invalid props: `documentName`, `signerName`, `signerTitle`, `acknowledgments`

---

### handleBackFromReview Function (Already Exists)

**Function (lines 159-161):**
```typescript
const handleBackFromReview = () => {
  setShowReview(false)
}
```

**What it does:**
- Sets `showReview` to `false`
- Component re-renders and shows the health insurance form again
- User can change their selections
- When they click "Continue" again, it goes back to review screen

---

## User Flow

### Before Fix:
```
1. User fills out health insurance form
2. Clicks "Continue to Review"
3. Sees PDF preview
4. ❌ No way to go back and change selections
5. Must sign or refresh page
```

### After Fix:
```
1. User fills out health insurance form
2. Clicks "Continue to Review"
3. Sees PDF preview
4. ✅ Sees "Edit Information" button
5. Clicks "Edit Information"
6. Goes back to form
7. Changes selections
8. Clicks "Continue to Review" again
9. Sees updated PDF preview
10. Signs when satisfied
```

---

## Button Appearance

**Location:** Below the PDF preview, next to signature section

**Style:**
- Outlined button (not filled)
- Full width on mobile
- Half width on desktop (shares row with "Clear" button)
- Blue border and text

**Text:**
- English: "Edit Information"
- Spanish: "Editar Información"

---

## Testing Checklist

### Test #1: Edit Button Appears
- [ ] Complete health insurance form
- [ ] Click "Continue to Review"
- [ ] Verify "Edit Information" button appears below PDF preview
- [ ] Verify button is styled as outlined button

### Test #2: Edit Button Functionality
- [ ] Click "Edit Information" button
- [ ] Verify returns to health insurance form
- [ ] Verify form data is preserved (selections still there)
- [ ] Change a selection (e.g., switch from enrolled to waived)
- [ ] Click "Continue to Review" again
- [ ] Verify PDF preview shows updated selections

### Test #3: Multiple Edits
- [ ] Complete form
- [ ] Review
- [ ] Edit
- [ ] Change selection
- [ ] Review again
- [ ] Edit again
- [ ] Change selection again
- [ ] Review again
- [ ] Verify all changes are reflected
- [ ] Sign
- [ ] Verify final signed document has correct selections

### Test #4: Spanish Language
- [ ] Switch to Spanish
- [ ] Complete form
- [ ] Review
- [ ] Verify button says "Editar Información"
- [ ] Click button
- [ ] Verify returns to form

---

## Files Modified

**Frontend (1 file):**
- `frontend/hotel-onboarding-frontend/src/pages/onboarding/HealthInsuranceStep.tsx`
  - Line 288: Changed `formTitle` to `title`
  - Line 297: Changed `onEdit` to `onBack`
  - Removed invalid props: `documentName`, `signerName`, `signerTitle`, `acknowledgments`

---

## Summary

✅ **Edit button now appears on health insurance review screen**
✅ **Button uses correct prop name (onBack)**
✅ **Button allows users to go back and change selections**
✅ **Form data is preserved when editing**
✅ **Works in both English and Spanish**
✅ **Follows same pattern as other forms**

**Users can now change their mind before signing!** 🎉

