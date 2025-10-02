# Review and Sign Components

This directory contains review and sign components for all important documents in the onboarding process.

## Overview

Each important form in the onboarding process now has a two-step workflow:
1. **Form Completion**: Employee fills out the form
2. **Review and Sign**: Employee reviews the entered information and provides electronic signature

## Components

### Generic Component
- `ReviewAndSign.tsx` - Generic review and sign component that can be used for any form

### Form-Specific Components
- `I9Section1Review.tsx` - Review component for I-9 Section 1 (Employment Eligibility)
- `W4Review.tsx` - Review component for W-4 (Tax Withholding)
- `DirectDepositReview.tsx` - Review component for Direct Deposit Authorization
- `PolicyAcknowledgmentReview.tsx` - Review component for Company Policies

## How to Add Review and Sign to a Form

### 1. Update the Form Step Component

```typescript
import React, { useState } from 'react'
import YourFormComponent from '@/components/YourFormComponent'
import YourFormReview from '@/components/reviews/YourFormReview'

export default function YourFormStep(props: StepProps) {
  const [formData, setFormData] = useState(null)
  const [isValid, setIsValid] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [isSigned, setIsSigned] = useState(false)

  // Show review mode
  if (showReview && formData) {
    return (
      <YourFormReview
        formData={formData}
        language={props.language}
        onSign={(signatureData) => {
          setIsSigned(true)
          props.markStepComplete('your-step-id', {
            formData,
            signature: signatureData,
            signed: true
          })
          setShowReview(false)
        }}
        onBack={() => setShowReview(false)}
      />
    )
  }

  // Show form mode
  return (
    <div>
      <YourFormComponent
        initialData={formData}
        onSave={setFormData}
        onValidationChange={setIsValid}
      />
      
      {isValid && formData && (
        <Button onClick={() => setShowReview(true)}>
          Review and Sign
        </Button>
      )}
    </div>
  )
}
```

### 2. Create a Review Component

```typescript
import React from 'react'
import ReviewAndSign from '../ReviewAndSign'

export default function YourFormReview({ formData, language, onSign, onBack }) {
  const renderPreview = (data) => {
    return (
      <div className="space-y-4">
        {/* Render your form data in a read-only format */}
        <div>
          <label className="text-sm text-gray-600">Field Name</label>
          <p className="font-medium">{data.fieldName}</p>
        </div>
        {/* Add more fields... */}
      </div>
    )
  }

  return (
    <ReviewAndSign
      formType="your_form_type"
      formData={formData}
      title="Your Form Title"
      description="Form description"
      language={language}
      onSign={onSign}
      onBack={onBack}
      renderPreview={renderPreview}
      signatureLabel={`${formData.firstName} ${formData.lastName}`}
      agreementText="Custom agreement text..."
      federalCompliance={{
        formName: 'Form Name',
        requiresWitness: false,
        retentionPeriod: 'X years'
      }}
    />
  )
}
```

## Federal Compliance

For forms that require federal compliance (I-9, W-4, etc.), ensure you include:

1. **Proper Agreement Text**: Use the exact language required by federal regulations
2. **Retention Requirements**: Specify how long the form must be retained
3. **Audit Trail**: The signature component automatically captures:
   - Timestamp
   - IP Address (in production)
   - User Agent
   - Form Data Hash

## Signature Data Structure

Each signature captures the following data:

```typescript
interface SignatureData {
  signature: string;           // Base64 encoded signature image
  signedAt: string;           // ISO timestamp
  ipAddress?: string;         // User's IP address
  userAgent?: string;         // Browser user agent
  formType: string;           // Type of form being signed
  formData: any;              // Complete form data at time of signing
  certificationStatement: string; // The agreement text
  federalCompliance?: {       // Optional federal compliance data
    formName: string;
    requiresWitness?: boolean;
    retentionPeriod?: string;
  }
}
```

## Best Practices

1. **Always show a preview** before asking for signature
2. **Make data read-only** during review
3. **Provide clear agreement text** that explains what the user is signing
4. **Allow going back** to edit if needed
5. **Save progress** at each step
6. **Validate completely** before allowing review

## Testing

When testing review and sign functionality:

1. Fill out the form with test data
2. Click "Review and Sign"
3. Verify all data displays correctly
4. Try the "Edit Information" button to go back
5. Sign and verify the signature is captured
6. Check that the form is marked as complete