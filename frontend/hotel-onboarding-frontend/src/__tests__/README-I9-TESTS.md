# I-9 Section 1 Test Suite Documentation

This document describes the comprehensive test suite created for the I-9 Section 1 form implementation.

## Test Files Created

### 1. Unit Tests: `I9Section1FormClean.test.tsx`
Tests the main form component with focus on:
- Component rendering and initialization
- Multi-step form navigation
- Field validation for all required fields
- Date, phone, and SSN formatting
- Citizenship status logic and conditional fields
- PDF preview generation
- Digital signature capture
- Error handling and recovery
- Language support (with TODO for Spanish translations)

### 2. Integration Tests: `i9PdfGeneratorMapped.test.ts`
Tests the PDF generation functionality:
- PDF template loading
- Date formatting (mmddyyyy format per USCIS requirements)
- Phone number formatting (strips formatting)
- SSN formatting (removes dashes)
- Field mapping to official I-9 form
- Citizenship checkbox handling
- Conditional field population for non-citizens
- Error handling for missing fields

### 3. Formatting Utilities Tests: `formatters.test.ts`
Tests all formatting functions used in the form:
- Date formatting for PDF (mmddyyyy)
- Phone number formatting and stripping
- SSN formatting and stripping
- ZIP code validation (5-digit and ZIP+4)
- Email validation
- Name uppercase conversion
- State code validation
- Character limit enforcement

### 4. End-to-End Tests: `I9Section1Workflow.e2e.test.tsx`
Tests complete user workflows:
- Full US citizen workflow
- Permanent resident workflow with USCIS number
- Authorized alien workflow with all fields
- Navigation and corrections
- Form validation scenarios
- Error recovery scenarios

### 5. Compliance Tests: `I9Section1Compliance.test.tsx`
Tests federal compliance requirements:
- All required fields per USCIS regulations
- Date format compliance (mmddyyyy)
- Valid US state codes only
- Digital signature metadata capture
- Federal penalty notices
- Field restrictions (SSN 9 digits, phone 10 digits, etc.)
- Work authorization expiration requirements
- PDF field mapping compliance

## Key Testing Areas

### 1. Date Formatting
- Dates must be formatted as mmddyyyy (8 digits, no separators) for PDF
- Component stores dates in ISO format internally
- PDF generator converts to required format

### 2. Phone Number Formatting
- Display format: (555) 123-4567
- PDF format: 5551234567 (digits only)
- Accepts various input formats

### 3. SSN Formatting
- Display format: 123-45-6789
- PDF format: 123456789 (digits only)
- Limited to 9 digits

### 4. Citizenship Status
- Four options with specific conditional fields:
  - US Citizen: No additional fields
  - Noncitizen National: No additional fields
  - Permanent Resident: USCIS/A-Number required
  - Authorized Alien: A-Number and expiration date required

### 5. Federal Compliance
- All fields marked with * are required
- Penalty of perjury notice before signature
- Digital signature captures timestamp and metadata
- Form data saved to backend for record keeping

## Running the Tests

```bash
# Run all I-9 tests
npm test -- --testNamePattern="I9"

# Run specific test suites
npm test -- src/__tests__/components/I9Section1FormClean.test.tsx
npm test -- src/__tests__/utils/i9PdfGeneratorMapped.test.ts
npm test -- src/__tests__/utils/formatters.test.ts
npm test -- src/__tests__/e2e/I9Section1Workflow.e2e.test.tsx
npm test -- src/__tests__/compliance/I9Section1Compliance.test.tsx

# Run with coverage
npm test -- --testNamePattern="I9" --coverage
```

## Test Coverage

The test suite covers:
- ✅ All form fields and validation rules
- ✅ Multi-step navigation forward and backward
- ✅ Date, phone, and SSN formatting
- ✅ PDF generation with field mapping
- ✅ Digital signature capture
- ✅ Federal compliance requirements
- ✅ Error handling and recovery
- ✅ Edge cases and validation
- ⚠️ Spanish translations (TODO - component needs i18n implementation)

## Notes for Developers

1. **Mock Dependencies**: Tests mock external dependencies like axios and PDF generation to run quickly and reliably.

2. **Accessibility**: Tests use accessible queries (getByRole, getByLabelText) to ensure the form is accessible.

3. **Async Operations**: Tests properly handle async operations with waitFor and userEvent.setup().

4. **Federal Requirements**: Pay special attention to compliance tests - these ensure we meet USCIS requirements.

5. **Future Enhancements**: 
   - Add Spanish language support to component
   - Add tests for keyboard navigation
   - Add visual regression tests for PDF output
   - Add performance tests for large forms