# Testing Guide: Single-Step Mode Fix

## Overview

This guide helps you test the fix for the critical bug where the Next button was disappearing in regular onboarding after completing direct deposit.

## What Was Fixed

**Problem:** Single-step mode state was leaking into regular onboarding, causing `totalSteps = 1` instead of ~12, which made the Next button disappear.

**Solution:** Added strict mode detection, safe navigation logic, and comprehensive logging to prevent state leaks.

## Test Scenarios

### ✅ Test 1: Regular Onboarding Flow (CRITICAL)

**This is the main bug fix - test this first!**

#### Steps:

1. **Start Regular Onboarding:**
   ```
   Open: http://localhost:3000/onboarding?token=<regular-onboarding-token>
   (No ?mode=single in URL)
   ```

2. **Check Console Logs:**
   ```
   Should see:
   🔍 OnboardingFlowPortal - Initialization: { mode: null, singleStepRequested: false, ... }
   📚 Initializing REGULAR onboarding mode
   🔄 OnboardingFlowController.initializeOnboarding - Disabling single-step mode
   🔴 Disabling single-step mode
   ✅ Single-step mode disabled, restored to full flow with 12 steps
   ✅ Regular onboarding session initialized: { totalSteps: 12, isSingleStepMode: false }
   ```

3. **Navigate to Direct Deposit Step:**
   - Complete all steps before direct deposit
   - Or jump directly to direct deposit if allowed

4. **Complete Direct Deposit:**
   - Fill out the form
   - Upload required documents
   - Sign the form
   - Click "Continue" or "Next"

5. **✅ VERIFY: Next Button Appears**
   ```
   After completing direct deposit, you should see:
   
   Console log:
   🔘 Navigation buttons: {
     isSingleStepMode: false,
     currentStepIndex: 5,  // or whatever step direct deposit is
     totalSteps: 12,
     isLastStep: false,
     shouldShowNext: true  // ← CRITICAL: Should be TRUE
   }
   
   UI:
   - Next button should be visible
   - Next button should be enabled (not disabled)
   - Clicking Next should advance to Human Trafficking Training
   ```

6. **Continue Through Remaining Steps:**
   - Verify you can complete the entire onboarding flow
   - Verify Next button appears on each step (except the last)

#### Expected Results:

- ✅ Next button appears after direct deposit
- ✅ Can advance to Human Trafficking Training
- ✅ Can complete full onboarding flow
- ✅ Console shows `isSingleStepMode: false` throughout
- ✅ Console shows `totalSteps: 12` (or full step count)

#### If Test Fails:

Check console for:
- Is `isSingleStepMode` incorrectly `true`?
- Is `totalSteps` incorrectly `1`?
- Is `shouldShowNext` incorrectly `false`?

---

### ✅ Test 2: Single-Step Invitation (Verify No Regression)

**Ensure single-step invites still work correctly**

#### Steps:

1. **Send Single-Step Invite:**
   - Go to HR Dashboard
   - Navigate to "Step Invitations" tab
   - Select "Direct Deposit" step
   - Enter recipient email
   - Send invitation

2. **Open Invitation Link:**
   ```
   URL should look like:
   http://localhost:3000/onboarding?token=<token>&mode=single&step=direct-deposit
   ```

3. **Check Console Logs:**
   ```
   Should see:
   🔍 OnboardingFlowPortal - Initialization: { mode: 'single', singleStepRequested: true, ... }
   📋 Initializing SINGLE-STEP mode
   ✅ Single-step session data: { targetStep: 'direct-deposit', ... }
   🔵 Enabling single-step mode: { stepId: 'direct-deposit', ... }
   ✅ Single-step mode enabled, steps count: 1
   ```

4. **Complete the Form:**
   - Fill out direct deposit information
   - Upload documents
   - Sign the form
   - Submit

5. **✅ VERIFY: No Next Button (Correct Behavior)**
   ```
   Console log:
   🔘 Navigation buttons: {
     isSingleStepMode: true,
     currentStepIndex: 0,
     totalSteps: 1,
     isLastStep: true,
     shouldShowNext: false  // ← CRITICAL: Should be FALSE
   }
   
   UI:
   - No Next button should appear (correct for single-step)
   - Only Submit/Complete button
   - After submit, should show completion message
   ```

#### Expected Results:

- ✅ Single-step mode activates correctly
- ✅ Only one step shown (direct deposit)
- ✅ No Next button (correct behavior)
- ✅ Form submits successfully
- ✅ Console shows `isSingleStepMode: true`
- ✅ Console shows `totalSteps: 1`

---

### ✅ Test 3: Mode Switching

**Verify state doesn't leak when switching between modes**

#### Steps:

1. **Complete Single-Step Invitation:**
   - Open single-step link
   - Complete the form
   - Close the browser tab

2. **Start Regular Onboarding:**
   - Open new tab
   - Use regular onboarding link (no `?mode=single`)
   - Verify regular mode activates

3. **Check Console:**
   ```
   Should see mode transition:
   📚 Initializing REGULAR onboarding mode
   🔴 Disabling single-step mode
   ✅ Single-step mode disabled, restored to full flow with 12 steps
   ```

4. **Verify Full Flow:**
   - All steps should be available
   - Next button should appear on each step
   - Can complete full onboarding

#### Expected Results:

- ✅ Regular mode activates despite previous single-step session
- ✅ Full step list restored
- ✅ No state leak from single-step mode

---

## Console Log Reference

### Healthy Regular Onboarding Logs:

```
🔍 OnboardingFlowPortal - Initialization: { mode: null, singleStepRequested: false }
📚 Initializing REGULAR onboarding mode
🔄 OnboardingFlowController.initializeOnboarding - Disabling single-step mode
🔴 Disabling single-step mode
✅ Single-step mode disabled, restored to full flow with 12 steps
✅ Regular onboarding session initialized: { totalSteps: 12, isSingleStepMode: false }

// On each step:
🔘 Navigation buttons: {
  isSingleStepMode: false,
  currentStepIndex: 5,
  totalSteps: 12,
  isLastStep: false,
  shouldShowNext: true
}
```

### Healthy Single-Step Logs:

```
🔍 OnboardingFlowPortal - Initialization: { mode: 'single', singleStepRequested: true }
📋 Initializing SINGLE-STEP mode
✅ Single-step session data: { targetStep: 'direct-deposit' }
🔵 Enabling single-step mode: { stepId: 'direct-deposit' }
✅ Single-step mode enabled, steps count: 1

🔘 Navigation buttons: {
  isSingleStepMode: true,
  currentStepIndex: 0,
  totalSteps: 1,
  isLastStep: true,
  shouldShowNext: false
}
```

### 🚨 Warning Signs (Indicates Bug):

```
// In regular onboarding:
❌ isSingleStepMode: true  // Should be false!
❌ totalSteps: 1           // Should be 12!
❌ shouldShowNext: false   // Should be true (unless last step)!

// In single-step:
❌ totalSteps: 12          // Should be 1!
❌ shouldShowNext: true    // Should be false!
```

---

## Quick Test Checklist

### Before Deploying:

- [ ] Test 1: Regular onboarding - Next button appears after direct deposit ✅
- [ ] Test 1: Can complete full onboarding flow ✅
- [ ] Test 2: Single-step invite works correctly ✅
- [ ] Test 2: No Next button in single-step mode ✅
- [ ] Test 3: Mode switching works correctly ✅
- [ ] Console logs show correct mode transitions ✅
- [ ] No errors in browser console ✅

### If Any Test Fails:

1. Check browser console for error messages
2. Verify URL parameters (`?mode=single` vs no mode param)
3. Check console logs for mode transitions
4. Verify `isSingleStepMode` and `totalSteps` values
5. Report issue with console logs

---

## Rollback Instructions

If critical issues are found:

```bash
# Rollback to previous version
git revert HEAD

# Or reset to pre-fix commit
git reset --hard 7a8ca6c

# Rebuild frontend
cd frontend/hotel-onboarding-frontend
npm run build
```

---

## Next Steps After Testing

Once all tests pass:

1. ✅ Mark "Test Single-Step Mode Fix" task as complete
2. 📋 Plan Phase 2: Personal Info Modal implementation
3. 🚀 Deploy to production

The modal implementation will be safe because:
- It only shows when `isSingleStepMode === true`
- Regular onboarding now guaranteed to have `isSingleStepMode === false`
- Zero risk of modal appearing in regular flow

