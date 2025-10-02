# I-9 Section 1 QA Testing Checklist

## Overview
This checklist provides comprehensive manual testing scenarios for QA engineers to validate the I-9 Section 1 form implementation. Each test should be performed across multiple browsers and devices.

## Test Environment Setup
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile iOS Safari
- [ ] Mobile Android Chrome
- [ ] Screen reader (NVDA/JAWS)

## Pre-Testing Requirements
- [ ] Test employee accounts created
- [ ] PDF template accessible at `/i9-form-template.pdf`
- [ ] Backend API endpoints available
- [ ] Network throttling tools ready

## Section 1: Personal Information Step

### Basic Field Validation
- [ ] **Last Name**
  - [ ] Empty field shows error
  - [ ] Special characters accepted (O'Brien, García)
  - [ ] Maximum length enforced
  - [ ] Whitespace trimmed
  
- [ ] **First Name**
  - [ ] Empty field shows error
  - [ ] Hyphenated names accepted (Mary-Jane)
  - [ ] Unicode characters supported
  - [ ] Copy/paste works correctly

- [ ] **Middle Initial**
  - [ ] Single character limit enforced
  - [ ] Auto-converts to uppercase
  - [ ] Optional field allows empty
  - [ ] Numbers rejected

- [ ] **Other Names**
  - [ ] Optional field
  - [ ] Multiple names accepted
  - [ ] Comma separation works
  - [ ] Long text handled

### Navigation Testing
- [ ] Next button disabled until required fields filled
- [ ] Previous button disabled on first step
- [ ] Progress bar updates correctly
- [ ] Browser back button behavior
- [ ] Unsaved changes warning

## Section 2: Address Step

### Address Fields
- [ ] **Street Address**
  - [ ] Required field validation
  - [ ] PO Box entry (note if restricted)
  - [ ] International format support
  - [ ] Special characters (Apt. #, Suite)

- [ ] **Apartment Number**  
  - [ ] Optional field
  - [ ] Alphanumeric accepted
  - [ ] Special formats (1A, B-2)
  - [ ] Maximum length

- [ ] **City**
  - [ ] Required field validation
  - [ ] International cities
  - [ ] Hyphenated cities (Winston-Salem)
  - [ ] Apostrophes (Coeur d'Alene)

- [ ] **State**
  - [ ] Dropdown functionality
  - [ ] Keyboard navigation
  - [ ] All 50 states present
  - [ ] DC included
  - [ ] Territories handling

- [ ] **ZIP Code**
  - [ ] 5-digit format (12345)
  - [ ] ZIP+4 format (12345-6789)
  - [ ] Invalid formats rejected
  - [ ] Leading zeros preserved (01234)

## Section 3: Contact & Details Step

### Date of Birth
- [ ] Calendar picker works
- [ ] Manual entry accepted
- [ ] Future dates rejected
- [ ] Age validation (18+ years)
- [ ] Leap year dates
- [ ] Invalid dates (02/30/2000)
- [ ] Different formats attempted

### SSN Field
- [ ] Auto-formatting (XXX-XX-XXXX)
- [ ] Only numbers accepted
- [ ] 9-digit validation
- [ ] Invalid patterns rejected:
  - [ ] 000-XX-XXXX
  - [ ] XXX-00-XXXX
  - [ ] XXX-XX-0000
  - [ ] 666-XX-XXXX
  - [ ] 900-999 in first segment
- [ ] Copy/paste handling
- [ ] Masking on review

### Email Address
- [ ] Valid email formats
- [ ] Invalid formats rejected:
  - [ ] Missing @
  - [ ] No domain
  - [ ] Multiple @
  - [ ] Spaces
- [ ] International domains
- [ ] Long email addresses
- [ ] Case sensitivity

### Phone Number
- [ ] Auto-formatting (XXX) XXX-XXXX
- [ ] 10-digit validation
- [ ] International format (+1)
- [ ] Extensions handling
- [ ] Invalid area codes
- [ ] Copy/paste with formatting

## Section 4: Citizenship Status

### Radio Button Selection
- [ ] Only one option selectable
- [ ] Keyboard navigation (arrow keys)
- [ ] Space/Enter selection
- [ ] Required field validation
- [ ] Visual focus indicators

### Conditional Fields

#### For Permanent Residents
- [ ] USCIS Number field appears
- [ ] Required validation
- [ ] Format validation (A-XXXXXXXXX)
- [ ] Other fields hidden

#### For Authorized Aliens
- [ ] All fields appear:
  - [ ] Alien Registration Number
  - [ ] Work Authorization Expiration
  - [ ] Foreign Passport Number
  - [ ] Country of Issuance
- [ ] Expiration date validation:
  - [ ] Cannot be past date
  - [ ] Warning if within 90 days
- [ ] Country field validation
- [ ] Passport format flexibility

## Section 5: PDF Generation & Preview

### PDF Generation
- [ ] Preview button enables after all steps
- [ ] Loading indicator during generation
- [ ] PDF displays in viewer
- [ ] All fields mapped correctly:
  - [ ] Personal information
  - [ ] Address formatted properly
  - [ ] Dates in mmddyyyy format
  - [ ] Phone without formatting
  - [ ] SSN without dashes
  - [ ] Citizenship checkbox marked
- [ ] PDF zoom controls work
- [ ] Download option available
- [ ] Print preview correct

### Error Scenarios
- [ ] PDF template missing
- [ ] Network timeout
- [ ] Invalid data handling
- [ ] Large data sets
- [ ] Special characters in PDF

## Section 6: Review & Sign

### Review Screen
- [ ] All entered data displayed
- [ ] Edit capability per section
- [ ] Federal compliance notice visible
- [ ] Legal attestation clear
- [ ] No timeout during review

### Signature Capture
- [ ] Canvas draws smoothly
- [ ] Touch screen support
- [ ] Mouse drawing works
- [ ] Clear button functions
- [ ] Signature required validation
- [ ] Undo/redo if available
- [ ] Different colors/widths

### Submission
- [ ] Submit button requires signature
- [ ] Confirmation message
- [ ] Success redirect
- [ ] Error handling:
  - [ ] Network failure
  - [ ] Server error
  - [ ] Timeout
  - [ ] Duplicate submission

## Section 7: Data Persistence & Recovery

### Auto-Save
- [ ] Progress saved per step
- [ ] Recovery after browser crash
- [ ] Session timeout handling
- [ ] Multiple tab behavior
- [ ] Logout/login persistence

### Data Integrity
- [ ] Special characters preserved
- [ ] Unicode support
- [ ] Maximum lengths enforced
- [ ] No data truncation
- [ ] Timestamp accuracy

## Section 8: Accessibility Testing

### Keyboard Navigation
- [ ] Tab through all fields
- [ ] Shift+Tab backwards
- [ ] Enter submits forms
- [ ] Escape cancels modals
- [ ] No keyboard traps
- [ ] Skip links present

### Screen Reader
- [ ] All fields announced
- [ ] Error messages read
- [ ] Progress announced
- [ ] Help text available
- [ ] Landmarks present
- [ ] Headings hierarchical

### Visual Testing
- [ ] High contrast mode
- [ ] Zoom to 200%
- [ ] Color blind friendly
- [ ] Focus indicators visible
- [ ] Error colors not sole indicator

## Section 9: Multi-Language Testing

### Language Toggle
- [ ] English/Spanish switch
- [ ] All text translated
- [ ] Federal notices translated
- [ ] Error messages translated
- [ ] PDF generates in selected language
- [ ] RTL language support (if applicable)

## Section 10: Performance Testing

### Load Testing
- [ ] Form loads < 3 seconds
- [ ] Step navigation < 1 second
- [ ] PDF generation < 10 seconds
- [ ] No memory leaks
- [ ] Multiple concurrent users

### Network Conditions
- [ ] Slow 3G performance
- [ ] Offline handling
- [ ] Intermittent connection
- [ ] Proxy/VPN compatibility
- [ ] CDN failover

## Section 11: Security Testing

### Data Protection
- [ ] HTTPS only
- [ ] No sensitive data in URLs
- [ ] Console logs clean
- [ ] Local storage encrypted
- [ ] Session management
- [ ] XSS prevention
- [ ] CSRF protection

### Compliance
- [ ] Audit trail created
- [ ] Timestamp recorded
- [ ] IP address captured
- [ ] Legal metadata present
- [ ] Retention period set

## Section 12: Integration Testing

### Backend API
- [ ] Save endpoint works
- [ ] Retrieve saved data
- [ ] Update existing data
- [ ] Delete functionality
- [ ] Error responses handled

### Document Management
- [ ] PDF stored correctly
- [ ] Signature image saved
- [ ] Metadata preserved
- [ ] Version control
- [ ] Access permissions

## Edge Cases & Negative Testing

### Data Entry
- [ ] SQL injection attempts
- [ ] Script injection (XSS)
- [ ] Extremely long inputs
- [ ] Null/undefined handling
- [ ] Concurrent modifications
- [ ] Race conditions

### System Limits
- [ ] Maximum field lengths
- [ ] File size limits
- [ ] Timeout thresholds
- [ ] Rate limiting
- [ ] Memory constraints

## Regression Testing
- [ ] Previous bugs fixed:
  - [ ] Date formatting
  - [ ] Phone validation
  - [ ] State dropdown
  - [ ] PDF generation
- [ ] No new bugs introduced
- [ ] Performance maintained
- [ ] All features working

## Sign-Off Criteria
- [ ] All critical tests passed
- [ ] No high-severity bugs
- [ ] Performance acceptable
- [ ] Accessibility compliant
- [ ] Security validated
- [ ] Federal compliance met

## Test Execution Log

| Test Section | Tester | Date | Pass/Fail | Notes |
|--------------|---------|------|-----------|-------|
| Personal Info | | | | |
| Address | | | | |
| Contact Details | | | | |
| Citizenship | | | | |
| PDF Generation | | | | |
| Signature | | | | |
| Accessibility | | | | |
| Performance | | | | |
| Security | | | | |

## Known Issues to Monitor
1. Date formatting in PDF (mmddyyyy)
2. Phone number international format
3. SSN validation patterns
4. State dropdown keyboard navigation
5. PDF template version compatibility
6. Signature canvas on mobile devices
7. Session timeout warnings
8. Multi-language PDF generation

## Final QA Sign-Off
- [ ] QA Lead Approval
- [ ] Development Team Review
- [ ] Compliance Officer Review
- [ ] Production Readiness Confirmed

**QA Engineer**: _______________________  
**Date**: _______________________  
**Version Tested**: _______________________