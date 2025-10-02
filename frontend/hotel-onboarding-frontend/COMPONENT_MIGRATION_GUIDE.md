# Component Migration Guide

## Overview
This guide explains how to migrate existing onboarding step components to use the new unified architecture.

## Key Changes

### 1. Remove Module-Specific Buttons
- Delete all Save, Submit, Continue buttons from components
- Navigation is handled by the parent portal

### 2. Use Unified Components
- Wrap content in `OnboardingStepWrapper`
- Use `FormField` for consistent field styling
- Use `FormError` for error display
- Auto-save is handled by parent

### 3. Expose Validation Method
Each component must expose a `validate()` method that returns:
```typescript
{
  isValid: boolean;
  errors: string[];
}
```

## Migration Example

### Before (JobDetailsStep):
```tsx
const handleSubmit = async () => {
  if (!acknowledged) {
    alert('You must review and accept...')
    return
  }
  // Save logic
  markStepComplete('job-details', data)
}

return (
  <div>
    {/* Content */}
    <Button onClick={handleSubmit}>
      Continue
    </Button>
  </div>
)
```

### After (JobDetailsStep):
```tsx
// Remove handleSubmit function

// Add validation method
useEffect(() => {
  if (props.currentStep) {
    props.currentStep.validate = () => {
      const errors = []
      if (!acknowledged) {
        errors.push('You must review and accept the job details')
      }
      return {
        isValid: acknowledged,
        errors
      }
    }
  }
}, [props.currentStep, acknowledged])

// Use wrapper component
return (
  <OnboardingStepWrapper
    title="Job Details Confirmation"
    description="Review your position details"
    icon={Briefcase}
    language={language}
  >
    {/* Content without any buttons */}
  </OnboardingStepWrapper>
)
```

## Step-by-Step Migration

### 1. Import New Components
```tsx
import { OnboardingStepWrapper } from '@/components/onboarding/OnboardingStepWrapper'
import { FormField } from '@/components/onboarding/FormField'
import { FormError } from '@/components/onboarding/FormError'
```

### 2. Remove Button Handlers
- Delete `handleSubmit`, `handleSave`, etc.
- Remove any onClick handlers for progression

### 3. Add Validation Method
```tsx
useEffect(() => {
  if (props.currentStep) {
    props.currentStep.validate = () => {
      // Your validation logic
      return {
        isValid: /* your condition */,
        errors: /* array of error messages */
      }
    }
  }
}, [props.currentStep, /* your dependencies */])
```

### 4. Wrap in OnboardingStepWrapper
```tsx
return (
  <OnboardingStepWrapper
    title={/* your title */}
    description={/* optional description */}
    icon={/* optional icon */}
    language={language}
  >
    {/* Your content without buttons */}
  </OnboardingStepWrapper>
)
```

### 5. Replace Form Fields
```tsx
// Before
<div>
  <Label>First Name</Label>
  <Input value={firstName} onChange={...} />
  {error && <p className="text-red-500">{error}</p>}
</div>

// After
<FormField
  id="firstName"
  label="First Name"
  type="text"
  value={firstName}
  onChange={setFirstName}
  error={errors.firstName}
  required
/>
```

## Components to Migrate

1. **JobDetailsStep** ✅
   - Remove submit button
   - Add validation method
   - Use wrapper

2. **I9Section1Step**
   - Remove review/sign buttons
   - Move validation to method
   - Simplify error display

3. **W4FormStep**
   - Remove submission logic
   - Add validation method
   - Use FormField components

4. **DirectDepositStep**
   - Keep document upload
   - Remove save button
   - Add validation

5. **CompanyPoliciesStep**
   - Remove signature trigger button
   - Validate initials and acknowledgment
   - Keep signature component

6. **TraffickingAwarenessStep**
   - Remove completion button
   - Track video/content viewing
   - Add validation

7. **HealthInsuranceStep**
   - Remove submit button
   - Validate plan selection
   - Use FormField

8. **DocumentUploadStep**
   - Keep upload functionality
   - Remove continue button
   - Validate required documents

9. **FinalReviewStep**
   - Remove submit button
   - Add final validation
   - Show completion status

## Benefits

1. **Consistent UX**: Users always know where navigation buttons are
2. **Better Progress Tracking**: Central save management
3. **Reduced Confusion**: No more double-button clicks
4. **Easier Maintenance**: Common patterns across all steps
5. **Better Error Handling**: Unified error display

## Testing

After migration:
1. Verify validation works
2. Check auto-save functionality
3. Ensure no orphaned buttons
4. Test error scenarios
5. Verify progress persistence