# PersonalInfoStep Debugging Guide

## Changes Made

1. **Auto-save on field change**: Both PersonalInformationForm and EmergencyContactsForm now call `onSave` whenever any field changes (not just on submit)
2. **Memoized callbacks**: Used `useCallback` to prevent infinite re-renders
3. **Added debugging logs**: Console logs added to track data flow
4. **Form keys**: Added unique keys to forms to ensure proper re-initialization
5. **Fixed initial data merging**: Emergency contacts now properly merge nested data

## Debugging Steps

### 1. Open Browser Console
Press F12 to open Developer Tools and go to Console tab before testing.

### 2. Check Session Storage
1. Go to Application/Storage tab in DevTools
2. Look for Session Storage
3. Find key: `onboarding_personal-info_data`
4. This should contain your form data in JSON format

### 3. Console Logs to Watch For
- `"Loading saved data:"` - Shows what data is being loaded from session storage
- `"Parsed data:"` - Shows the parsed JSON structure
- `"Saving personal info:"` - Shows when personal info is being saved
- `"Saving emergency contacts:"` - Shows when emergency contacts are being saved

### 4. Test Flow

#### Test 1: Basic Data Entry
1. Navigate to Personal Information step
2. Fill in Personal Details:
   - First Name: Goutham
   - Last Name: Vemula
   - etc.
3. Watch console for "Saving personal info:" logs
4. Check Session Storage to see if data is saved

#### Test 2: Tab Navigation
1. After filling Personal Details, click "Emergency Contacts" tab
2. Check console - you should see saved personal info data
3. Fill in Primary Emergency Contact
4. Click back to "Personal Details" tab
5. **Your personal data should still be there**
6. Check console logs for any errors

#### Test 3: Step Navigation
1. Fill both forms
2. Navigate to previous step (Job Details)
3. Navigate forward to Personal Information
4. Check console logs - should show "Loading saved data:"
5. Both forms should have your data

### 5. Common Issues to Check

#### Issue: Data not persisting between tabs
- Check console for errors
- Verify "Saving personal info:" logs appear when typing
- Check Session Storage has the data
- Look for any React errors about infinite loops

#### Issue: Validation errors when all fields filled
- Check the exact error message
- Open Session Storage and verify the data structure
- Should look like:
```json
{
  "personalInfo": {
    "firstName": "Goutham",
    "lastName": "Vemula",
    "email": "vgoutamram@gmail.com",
    // ... other fields
  },
  "emergencyContacts": {
    "primaryContact": {
      "name": "Contact Name",
      "relationship": "spouse",
      "phoneNumber": "1234567890"
    },
    // ... other fields
  },
  "activeTab": "personal"
}
```

#### Issue: Forms re-rendering and losing data
- Check for console errors about keys
- Verify no infinite loops in console
- Check React DevTools for excessive re-renders

### 6. Manual Validation Check
If validation still shows errors:
1. Open console
2. Run: `sessionStorage.getItem('onboarding_personal-info_data')`
3. Copy the result
4. Check if all required fields are present:
   - personalInfo: firstName, lastName, email, phone, address, city, state, zipCode
   - emergencyContacts.primaryContact: name, relationship, phoneNumber

### 7. Clear and Retry
If issues persist:
1. Clear session storage: `sessionStorage.clear()`
2. Refresh the page
3. Start fresh and observe console logs from the beginning

## Expected Console Output

When working correctly, you should see:
```
Loading saved data: null (first time)
Saving personal info: {firstName: "G", ...} (as you type)
Saving personal info: {firstName: "Go", ...} (continues as you type)
...
Saving emergency contacts: {primaryContact: {...}, ...} (when on emergency tab)
Loading saved data: {"personalInfo":{...},"emergencyContacts":{...}} (when returning to step)
```

## Report Back
Please share:
1. Any console errors
2. The structure of data in Session Storage
3. Which specific validation errors you're seeing
4. At what point the data loss occurs (if any)