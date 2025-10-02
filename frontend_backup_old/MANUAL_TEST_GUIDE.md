# Manual Testing Guide for Enhanced Onboarding Flow

## Test URL
Open your browser and navigate to: http://localhost:3001/onboard-flow-test

## Pre-Test Setup
1. Clear browser cache and cookies
2. Open browser developer console to check for errors
3. Have test data ready (fake SSN, addresses, etc.)

## Step-by-Step Test Process

### 1. Welcome Step
- [ ] Page loads without errors
- [ ] Language toggle between English/Español works
- [ ] Welcome content displays in selected language
- [ ] Auto-save indicator appears when idle
- [ ] Can proceed without filling anything (welcome is informational)

### 2. Personal Information Step
- [ ] Two tabs visible: "Personal Details" and "Emergency Contacts"
- [ ] All form fields are present and labeled correctly
- [ ] Validation errors appear for invalid inputs
- [ ] Auto-save triggers after 2 seconds of typing
- [ ] Can switch between tabs without losing data
- [ ] Cannot proceed without required fields

### 3. Job Details Step
- [ ] Job information displays correctly
- [ ] Position, department, start date visible
- [ ] Manager information shown
- [ ] Must check acknowledgment to complete
- [ ] Step auto-completes when acknowledged

### 4. Company Policies Step
- [ ] Long policy text is scrollable
- [ ] Sexual Harassment Policy requires initials
- [ ] EEO Policy requires initials
- [ ] Acknowledgment checkbox appears after initials
- [ ] Digital signature appears after acknowledgment
- [ ] Cannot proceed without all requirements

### 5. I-9 Section 1 Step
- [ ] Two tabs: "Fill Form" and "Preview & Sign"
- [ ] Federal compliance notice displays
- [ ] All I-9 fields present
- [ ] Preview tab disabled until form valid
- [ ] Can review PDF preview
- [ ] Digital signature required

### 6. W-4 Tax Form Step
- [ ] Similar to I-9 with form/preview tabs
- [ ] Tax calculations work correctly
- [ ] Important tax information displayed
- [ ] Preview shows completed form
- [ ] Signature captures properly

### 7. Direct Deposit Step
- [ ] Can choose between direct deposit and paper check
- [ ] Bank fields appear for direct deposit
- [ ] Paper check shows different message
- [ ] Review section shows selections
- [ ] Authorization signature required

### 8. Human Trafficking Awareness Step
- [ ] Training module loads
- [ ] Federal requirement notice shown
- [ ] Can complete training
- [ ] Certificate generates on completion
- [ ] Auto-marks complete when done

### 9. Weapons Policy Step
- [ ] Zero tolerance notice prominent
- [ ] Policy content readable
- [ ] Acknowledgment required
- [ ] Signature captures correctly

### 10. Health Insurance Step
- [ ] Plan options displayed
- [ ] Can add/remove dependents
- [ ] Enrollment period notice shown
- [ ] Review shows all selections
- [ ] Signature required for enrollment

### 11. Document Upload Step
- [ ] Can choose List A or List B+C strategy
- [ ] Document cards show correctly
- [ ] Upload buttons work
- [ ] Shows upload progress
- [ ] Validates document requirements

### 12. I-9 Supplements Step
- [ ] Most users can select "No assistance needed"
- [ ] Supplement A form appears if translator selected
- [ ] Supplement B info explains manager responsibility
- [ ] Can complete quickly if no supplements needed

### 13. Final Review Step
- [ ] Shows overall progress percentage
- [ ] Lists all completed steps
- [ ] Final acknowledgments required
- [ ] Final signature captures
- [ ] Shows completion message when done

## Navigation Tests
- [ ] Next button only enabled when step is valid
- [ ] Previous button always works
- [ ] Progress bar updates correctly
- [ ] Can jump to any completed step from progress bar
- [ ] Cannot skip ahead to incomplete steps

## Data Persistence Tests
- [ ] Fill some data, navigate away, come back - data persists
- [ ] Refresh page - returns to last incomplete step
- [ ] Language preference persists across steps
- [ ] Signatures are saved and displayed

## Error Handling Tests
- [ ] Invalid SSN shows error
- [ ] Future dates for DOB show error
- [ ] Missing required fields highlight in red
- [ ] Error messages clear when fixed
- [ ] Network errors handled gracefully

## Responsive Design Tests
- [ ] Test on mobile viewport (375px)
- [ ] Test on tablet viewport (768px)
- [ ] Test on desktop (1024px+)
- [ ] All forms remain usable
- [ ] Modals and signatures work on touch

## Performance Tests
- [ ] Each step loads within 2 seconds
- [ ] Auto-save doesn't cause lag
- [ ] Form inputs are responsive
- [ ] No memory leaks in console

## Accessibility Tests
- [ ] Tab navigation works through forms
- [ ] Screen reader labels present
- [ ] Color contrast sufficient
- [ ] Focus indicators visible

## Known Issues to Watch For
1. TypeScript errors in test files (doesn't affect runtime)
2. Some validation utils have type mismatches
3. Test components may have outdated props

## Test Data to Use
- SSN: 123-45-6789
- Phone: (555) 123-4567
- Email: test@example.com
- Bank Routing: 123456789
- Bank Account: 987654321

## Success Criteria
- All steps complete without console errors
- Data saves and persists correctly
- Navigation works in both directions
- All validations function properly
- Signatures capture and display
- Final review shows accurate summary
- Completion message appears at end