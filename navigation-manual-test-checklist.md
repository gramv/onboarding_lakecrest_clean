# Navigation Standardization - Manual Test Checklist

## Quick Test Guide for Standardized Navigation

### Prerequisites
- Frontend running on http://localhost:3001
- Backend running on http://localhost:8000
- Employee login credentials

### Test 1: Navigation Button Consistency ✓

Login and go through each onboarding step, checking:

1. **WelcomeStep**
   - [ ] Only "Get Started" button visible (no Previous button)
   - [ ] Button disabled for 3 seconds, then enabled
   - [ ] Mobile: Progress indicator shows at bottom

2. **PersonalInfoStep**
   - [ ] Previous button now visible
   - [ ] Continue button disabled until both tabs completed
   - [ ] Mobile: Sticky navigation at bottom

3. **JobDetailsStep**
   - [ ] Previous and Continue buttons both visible
   - [ ] Continue enabled when form is valid

4. **W4FormStep**
   - [ ] Previous and Continue buttons
   - [ ] Continue disabled until signature captured

5. **I9Section1Step**
   - [ ] Previous and Continue buttons
   - [ ] Continue disabled until form complete

6. **I9Section2Step**
   - [ ] Previous and Continue buttons
   - [ ] Special validation for document verification

7. **I9ReviewSignStep**
   - [ ] Previous and Continue buttons
   - [ ] Continue becomes "Submit" after signature

8. **DirectDepositStep**
   - [ ] Previous and Continue buttons
   - [ ] Continue enabled after bank info entered

9. **CompanyPoliciesStep**
   - [ ] Previous and Continue buttons
   - [ ] Continue disabled until all sections completed

10. **HealthInsuranceStep**
    - [ ] Previous and Continue buttons
    - [ ] Continue enabled after coverage selection

11. **EmergencyContactsStep**
    - [ ] Previous and Continue buttons
    - [ ] Continue enabled when contacts added

12. **BackgroundCheckStep**
    - [ ] Previous and Continue buttons
    - [ ] Continue enabled after consent

13. **WeaponsPolicyStep**
    - [ ] Previous and Continue buttons
    - [ ] Continue enabled after acknowledgment

14. **TraffickingAwarenessStep**
    - [ ] Previous and Continue buttons
    - [ ] Continue enabled after video/content viewed

15. **FinalReviewStep**
    - [ ] Previous button visible
    - [ ] Submit button instead of Continue
    - [ ] Submit enabled when all reviewed

### Test 2: Button States ✓

For each step, verify:

- [ ] **Previous Button**
  - Hidden on first step (WelcomeStep)
  - Visible and enabled on all other steps
  - Navigates back to previous step

- [ ] **Next/Continue Button**
  - Shows "Get Started" on WelcomeStep
  - Shows "Continue" on most steps
  - Shows "Submit" on final steps
  - Disabled until requirements met
  - Becomes enabled when step is valid

### Test 3: Progress Display ✓

#### Mobile View (width < 640px)
- [ ] Progress indicator appears at bottom of navigation
- [ ] Shows "Step X of Y"
- [ ] Shows "XX% Complete"
- [ ] Progress bar visible under text

#### Desktop View (width >= 640px)
- [ ] No progress indicator in navigation buttons
- [ ] Global progress bar in header/sidebar
- [ ] Mobile progress elements hidden

### Test 4: Jump Navigation ✓

Using the global progress bar:

- [ ] Can click on completed steps to jump back
- [ ] Cannot click on future uncompleted steps
- [ ] Current step is highlighted
- [ ] Completed steps show checkmark
- [ ] Future steps are grayed out

### Test 5: Translation Support ✓

Switch language to Spanish and verify:

- [ ] "Continue" → "Continuar"
- [ ] "Previous" → "Anterior"
- [ ] "Get Started" → "Comenzar"
- [ ] "Back" → "Atrás"
- [ ] "Submit" → "Enviar"
- [ ] "Step X of Y" → "Paso X de Y"
- [ ] "XX% Complete" → "XX% Completo"

### Test 6: Mobile Responsive ✓

On mobile devices or browser mobile view:

- [ ] Navigation buttons stick to bottom of screen
- [ ] Buttons are full width
- [ ] Minimum height of 48px for touch targets
- [ ] Shadow or border separates navigation from content
- [ ] Progress indicator shows below buttons
- [ ] Smooth scrolling when navigating

### Test 7: Special Cases ✓

- [ ] **Form with errors**: Continue button shows red and is disabled
- [ ] **Saving state**: Button shows spinner while saving
- [ ] **Network issues**: Appropriate error handling
- [ ] **Browser back/forward**: Navigation state maintained
- [ ] **Page refresh**: Returns to correct step

## Automated Test

To run the automated test suite:

```bash
# Install dependencies (if not already installed)
cd /Users/gouthamvemula/onbfinaldev
npm install puppeteer

# Run the test
node test-navigation-standardization.js
```

## Expected Behavior Summary

### ✅ All Steps Should Have:
- Consistent NavigationButtons component usage
- Proper button states (enabled/disabled)
- Correct translations in both languages
- Mobile-responsive sticky navigation
- Progress indicators on mobile

### ❌ Common Issues to Watch For:
- Missing Previous button on non-first steps
- Continue button enabled when it shouldn't be
- Progress indicator not showing on mobile
- Translation keys not working
- Navigation not sticky on mobile
- Cannot navigate back to completed steps

## Test Results

| Step | Navigation Present | Button States | Mobile Progress | Translation | Status |
|------|-------------------|---------------|-----------------|-------------|---------|
| WelcomeStep | | | | | |
| PersonalInfoStep | | | | | |
| JobDetailsStep | | | | | |
| W4FormStep | | | | | |
| I9Section1Step | | | | | |
| I9Section2Step | | | | | |
| I9ReviewSignStep | | | | | |
| DirectDepositStep | | | | | |
| CompanyPoliciesStep | | | | | |
| HealthInsuranceStep | | | | | |
| EmergencyContactsStep | | | | | |
| BackgroundCheckStep | | | | | |
| WeaponsPolicyStep | | | | | |
| TraffickingAwarenessStep | | | | | |
| FinalReviewStep | | | | | |

### Overall Status: [ ] PASS / [ ] FAIL

### Notes:
_Add any issues or observations here_

---

**Test Date:** _______________
**Tester:** _______________
**Environment:** Development / Staging / Production