# PersonalInfoStep Testing Guide

## Issues Fixed

1. **Data Structure Mismatch**: Updated validator to handle nested data structure (`personalInfo` and `emergencyContacts` objects)
2. **Data Persistence**: Added session storage to save form data immediately when changed
3. **Tab Navigation**: Data now persists when switching between Personal Details and Emergency Contacts tabs
4. **Form Loading**: Forms only render after saved data is loaded to prevent data loss

## How to Test

### 1. Initial Load Test
1. Navigate to `/onboard?token=demo-token`
2. Click through Welcome step to reach Personal Information step
3. Verify both tabs are displayed: "Personal Details" and "Emergency Contacts"

### 2. Personal Details Form Test
1. Fill in all required fields:
   - First Name
   - Last Name
   - Date of Birth
   - SSN (format: XXX-XX-XXXX)
   - Phone Number
   - Email
   - Address
   - City
   - State
   - ZIP Code
2. Optional fields:
   - Middle Initial
   - Preferred Name
   - Apt/Unit Number
   - Gender
   - Marital Status

### 3. Tab Navigation Test
1. After filling Personal Details, click on "Emergency Contacts" tab
2. Fill in Primary Emergency Contact:
   - Full Name
   - Relationship
   - Phone Number
3. Go back to "Personal Details" tab
4. **Verify all your previously entered data is still there**

### 4. Emergency Contacts Test
1. Go to "Emergency Contacts" tab
2. Fill in all required Primary Contact fields
3. Optionally fill Secondary Contact
4. Fill optional Medical Information

### 5. Data Persistence Test
1. After filling both forms, navigate to previous step (Job Details)
2. Then navigate forward to Personal Information again
3. **Verify all data in both tabs is preserved**

### 6. Browser Refresh Test
1. Fill in some data in both tabs
2. Refresh the browser (F5)
3. Navigate back to Personal Information step
4. **Verify your data is still there**

### 7. Validation Test
1. Try to proceed to next step without filling required fields
2. You should see validation errors
3. Fill in all required fields in both tabs
4. The step should be marked as complete (green checkmark)
5. You should be able to proceed to next step

### 8. Auto-Save Indicator Test
1. Start typing in any field
2. Watch for the auto-save indicator (should show "Saving..." then "Saved")
3. This confirms data is being persisted

## Expected Behavior

- ✅ Data persists when switching between tabs
- ✅ Data persists when navigating between steps
- ✅ Data persists after browser refresh (within same session)
- ✅ Both forms validate independently
- ✅ Step only completes when both forms are valid
- ✅ Auto-save works for all changes

## Known Limitations

- Data is stored in browser's sessionStorage (clears when browser tab is closed)
- In production, data would be saved to backend API
- Demo mode simulates API calls but doesn't actually persist to a database

## Troubleshooting

If data is not persisting:
1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Check Session Storage for keys starting with `onboarding_personal-info_data`
4. The value should contain your form data in JSON format

If validation is not working correctly:
1. Make sure you've filled all required fields marked with red asterisk (*)
2. Check browser console for any errors
3. The validation runs when you blur out of a field or try to submit