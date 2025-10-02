# Job Application Form V2 Tests

This directory contains comprehensive tests for the new multi-step job application form.

## Test Files

### Component Tests

1. **JobApplicationFormV2.test.tsx**
   - Main form component tests
   - Multi-step navigation
   - Form data persistence and draft saving
   - Form submission
   - Progress tracking
   - Error handling

2. **PersonalInformationStep.test.tsx**
   - Personal information form validation
   - Field formatting (phone, ZIP code)
   - Required field validation
   - Age verification
   - Address components

3. **PositionAvailabilityStep.test.tsx**
   - Department and position selection
   - Employment type and schedule preferences
   - Availability questions
   - Work authorization
   - Salary expectations

4. **EmploymentHistoryStep.test.tsx**
   - Dynamic employment history entries
   - Add/edit/remove employment records
   - Date validation
   - Current employment handling
   - Supervisor contact permissions

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test file
```bash
npm test -- JobApplicationFormV2.test.tsx
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run only job application tests
```bash
npm test -- --testPathPattern="job-application"
```

## Backend Tests

Run the Python backend tests:
```bash
python test_job_application_v2_backend.py
```

## Test Coverage Areas

### Form Functionality
- ✅ Multi-step navigation (forward/backward)
- ✅ Step completion tracking
- ✅ Progress calculation
- ✅ Draft saving to localStorage
- ✅ Draft loading on mount
- ✅ Form submission

### Validation
- ✅ Required field validation
- ✅ Email format validation
- ✅ Phone number formatting and validation
- ✅ ZIP code validation
- ✅ Date validation (employment dates)
- ✅ Conditional field validation

### User Experience
- ✅ Error message display
- ✅ Loading states
- ✅ Success confirmation
- ✅ Duplicate submission prevention
- ✅ Network error handling

### Data Management
- ✅ Complex array handling (employment history, references)
- ✅ Nested object updates
- ✅ Field dependencies (department/position)
- ✅ Conditional fields (work authorization)

### Edge Cases
- ✅ Empty states
- ✅ Maximum entries (employment history)
- ✅ Special characters in text fields
- ✅ Very long text inputs
- ✅ Concurrent submissions
- ✅ Browser back/forward navigation

## Mock Data

Tests use consistent mock data defined in each test file:
- Mock property information
- Mock departments and positions
- Mock form data for different scenarios

## Best Practices

1. **Isolation**: Each test is independent and doesn't rely on others
2. **Clarity**: Test names clearly describe what is being tested
3. **Coverage**: Both positive and negative scenarios are tested
4. **Mocking**: External dependencies (axios, navigation) are mocked
5. **Accessibility**: Tests verify proper ARIA attributes and labels

## Debugging Tests

To debug a specific test:
1. Add `console.log` statements in the test
2. Use `screen.debug()` to see the current DOM
3. Run test in watch mode for faster feedback
4. Check test output for detailed error messages

## Future Improvements

- Add visual regression tests
- Add performance tests for large forms
- Add more accessibility tests
- Add internationalization tests
- Add browser compatibility tests