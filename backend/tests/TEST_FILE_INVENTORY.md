# Test File Inventory

## Overview
This document provides a complete inventory of all test files that were migrated from the root directory to organized test folders.

## Directory Structure
```
tests/
├── debug_scripts/        # Development and debugging scripts
├── integration/          # Actual integration tests
│   ├── applications/     # Application flow tests
│   ├── auth/            # Authentication tests
│   ├── documents/       # Document generation tests
│   ├── email/           # Email functionality tests
│   ├── hr/              # HR dashboard tests
│   ├── managers/        # Manager functionality tests
│   ├── ocr/             # OCR service tests
│   ├── onboarding/      # Onboarding flow tests
│   └── websocket/       # WebSocket tests
└── backup/              # Backup folder for obsolete tests
```

## File Locations

### Debug Scripts (23 files)
Located in: `tests/debug_scripts/`
- `test_api_response_structure.py` - Debug API response formats
- `test_and_fix_email_system.py` - Email system debugging
- `test_certificate_system.py` - Certificate system testing
- `test_clickwise_deployment.py` - Deployment testing
- `test_field_mappings.py` - Field mapping debugging
- `test_fill_form_fields.py` - Form field testing
- `test_frontend_pdf_preview.py` - Frontend PDF preview testing
- `test_frontend_simulation.py` - Frontend simulation
- `test_groq_api.py` - Groq API connection test
- `test_health_pdf_debug.py` - Health insurance PDF debugging
- `test_hi_family_ui_integration.py` - UI integration testing
- `test_hi_ui_integration.py` - UI integration testing
- `test_pdf_generation_fix.py` - PDF generation fixes
- `test_pdf_preview_after_signing.py` - PDF preview testing
- `test_preview_state_transition.py` - Preview state debugging
- `test_production_fixes.py` - Production issue fixes
- `test_production_i9_ocr.py` - Production I9 OCR testing
- `test_routing_validation.py` - Routing validation
- `test_signature_date.py` - Signature date testing
- `test_simple_application.py` - Simple application debug
- `test_simple_onboarding_token.py` - Token testing
- `test_state_transition_fix.py` - State transition debugging
- `test_url_fix_verification.py` - URL fix verification

### Authentication Tests (4 files)
Located in: `tests/integration/auth/`
- `test_auth_direct.py` - Direct authentication testing
- `test_frontend_login.py` - Frontend login simulation
- `test_login_simple.py` - Simple login test
- `test_password_reset.py` - Password reset functionality

### Application Tests (6 files)
Located in: `tests/integration/applications/`
- `test_application_email.py` - Application email functionality
- `test_application_flow.py` - Complete application flow
- `test_approval_and_name_fix.py` - Approval with name fixes
- `test_approval_and_name.py` - Approval functionality
- `test_check_applications.py` - Application checking
- `test_job_application_flow.py` - Job application flow

### Document Generation Tests (30 files)
Located in: `tests/integration/documents/`
- `test_company_policies_pdf.py` - Company policies PDF
- `test_direct_deposit_comprehensive.py` - Comprehensive DD tests
- `test_direct_deposit_endpoint.py` - DD endpoint testing
- `test_direct_deposit_final.py` - Final DD tests
- `test_direct_deposit_form.py` - DD form testing
- `test_direct_deposit_generation.py` - DD generation
- `test_direct_deposit_local.py` - Local DD testing
- `test_direct_deposit_multi_account.py` - Multi-account DD
- `test_direct_deposit_overlay.py` - DD overlay testing
- `test_direct_deposit_pdf.py` - DD PDF generation
- `test_document_endpoints.py` - Document endpoints
- `test_health_insurance_api.py` - Health insurance API
- `test_health_insurance_complete_final.py` - Complete HI tests
- `test_health_insurance_complete_flow.py` - HI flow testing
- `test_health_insurance_comprehensive.py` - Comprehensive HI
- `test_health_insurance_enhanced.py` - Enhanced HI tests
- `test_health_insurance_flow.py` - HI flow
- `test_health_insurance_pdf_preview.py` - HI PDF preview
- `test_health_insurance_pdf.py` - HI PDF generation
- `test_health_insurance_personal_info.py` - HI personal info
- `test_health_insurance_update.py` - HI updates
- `test_hi_pdf_complete.py` - Complete HI PDF
- `test_hi_signature.py` - HI signature testing
- `test_i9_complete_autosave.py` - I9 autosave
- `test_i9_ocr_complete_flow.py` - I9 OCR flow
- `test_i9_signed_pdf.py` - I9 signed PDF
- `test_trafficking_signature.py` - Trafficking doc signature
- `test_weapons_invitation.py` - Weapons policy invitation
- `test_weapons_policy_signature.py` - Weapons policy signature
- `test_weapons_policy.py` - Weapons policy testing

### Email Tests (6 files)
Located in: `tests/integration/email/`
- `test_email_fix.py` - Email fixes
- `test_email_notifications_simple.py` - Simple notifications
- `test_email_notifications.py` - Email notifications
- `test_email_preferences.py` - Email preferences
- `test_email_reuse.py` - Email reuse testing
- `test_email_scenarios.py` - Email scenarios

### HR Dashboard Tests (7 files)
Located in: `tests/integration/hr/`
- `test_hr_applications_endpoint.py` - HR applications endpoint
- `test_hr_dashboard_complete.py` - Complete dashboard tests
- `test_hr_dashboard_overview.py` - Dashboard overview
- `test_hr_endpoint_security.py` - Endpoint security
- `test_hr_endpoints.py` - HR endpoints
- `test_hr_invitations.py` - HR invitations
- `test_hr_manager_employee.py` - Manager-employee relations

### Manager Tests (5 files)
Located in: `tests/integration/managers/`
- `test_manager_dashboard_api.py` - Dashboard API
- `test_manager_endpoints.py` - Manager endpoints
- `test_manager_login_detailed.py` - Detailed login tests
- `test_manager_login_flow.py` - Login flow
- `test_manager_login.py` - Manager login

### OCR Tests (6 files)
Located in: `tests/integration/ocr/`
- `test_fixed_ocr.py` - Fixed OCR testing
- `test_google_ocr_working.py` - Google OCR verification
- `test_google_ocr.py` - Google OCR tests
- `test_ocr_with_token.py` - OCR with token
- `test_tn_license_extraction.py` - TN license extraction
- `test_voided_check_ocr.py` - Voided check OCR

### Onboarding Tests (2 files)
Located in: `tests/integration/onboarding/`
- `test_direct_onboarding.py` - Direct onboarding
- `test_onboarding_portal_access.py` - Portal access

### WebSocket Tests (5 files)
Located in: `tests/integration/websocket/`
- `test_websocket_application_events.py` - Application events
- `test_websocket_broadcasting.py` - Broadcasting tests
- `test_websocket_comprehensive.py` - Comprehensive tests
- `test_websocket_connection.py` - Connection tests
- `test_websocket_dashboard_updates.py` - Dashboard updates

### General Integration Tests (6 files)
Located in: `tests/integration/`
- `test_baseline_runner.py` - Baseline test runner
- `test_critical_endpoints.py` - Critical endpoints
- `test_cross_property_isolation.py` - Property isolation
- `test_integration_complete.py` - Complete integration
- `test_performance_final.py` - Performance tests
- `test_phase1_complete.py` - Phase 1 tests

## Usage Guidelines

### Running Debug Scripts
Debug scripts in `tests/debug_scripts/` are standalone utilities for testing specific features:
```bash
cd tests/debug_scripts
python3 test_groq_api.py  # Test Groq API connection
```

### Running Integration Tests
Integration tests can be run using pytest:
```bash
# Run all integration tests
pytest tests/integration/

# Run specific category
pytest tests/integration/auth/
pytest tests/integration/documents/

# Run specific test file
pytest tests/integration/auth/test_login_simple.py
```

### Important Notes
1. All test files have been preserved - nothing was deleted
2. Debug scripts are kept for troubleshooting purposes
3. Integration tests are organized by functionality
4. The backend still imports and runs correctly after migration
5. No import paths were broken as test files weren't imported elsewhere

## Maintenance
- Add new integration tests to the appropriate subfolder
- Keep debug scripts in `debug_scripts/` for development use
- Document any new test categories in this file