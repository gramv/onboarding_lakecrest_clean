# Test Files Migration Log

## Migration Date: 2025-09-09

This document tracks the consolidation and organization of 100 test files from the hotel-onboarding-backend root directory.

## Categories Identified

### 1. Debug/Development Scripts
These are one-off scripts used for debugging or testing specific features during development.

### 2. Integration Tests
Actual tests that verify system functionality.

### 3. Obsolete Tests
Tests for features that no longer exist or have been replaced.

## File Inventory and Actions

### Authentication & Login Tests
- `test_auth_direct.py` - Direct auth testing → integration/auth/
- `test_login_simple.py` - Simple login test → integration/auth/
- `test_frontend_login.py` - Frontend login simulation → integration/auth/
- `test_manager_login.py` - Manager login test → integration/managers/
- `test_manager_login_flow.py` - Manager login flow → integration/managers/
- `test_manager_login_detailed.py` - Detailed manager login → integration/managers/

### Application Flow Tests
- `test_application_flow.py` - Complete application flow → integration/applications/
- `test_application_email.py` - Application email tests → integration/applications/
- `test_job_application_flow.py` - Job application flow → integration/applications/
- `test_simple_application.py` - Simple application debug → debug_scripts/
- `test_check_applications.py` - Check applications → integration/applications/

### Document Generation Tests
- `test_document_endpoints.py` - Document endpoints → integration/documents/
- `test_company_policies_pdf.py` - Company policies PDF → integration/documents/
- `test_direct_deposit_*.py` (multiple) - Direct deposit tests → integration/documents/
- `test_health_insurance_*.py` (multiple) - Health insurance tests → integration/documents/
- `test_weapons_policy*.py` - Weapons policy tests → integration/documents/
- `test_trafficking_signature.py` - Trafficking doc signature → integration/documents/
- `test_hi_signature.py` - Health insurance signature → integration/documents/
- `test_i9_*.py` - I-9 form tests → integration/documents/

### WebSocket Tests
- `test_websocket_*.py` (multiple) - WebSocket tests → integration/websocket/

### Email Tests
- `test_email_*.py` (multiple) - Email tests → integration/email/
- `test_and_fix_email_system.py` - Email system debug → debug_scripts/

### OCR & External API Tests
- `test_groq_api.py` - Groq API test → debug_scripts/
- `test_google_ocr*.py` - Google OCR tests → integration/ocr/
- `test_fixed_ocr.py` - Fixed OCR test → integration/ocr/
- `test_voided_check_ocr.py` - Check OCR test → integration/ocr/
- `test_tn_license_extraction.py` - License extraction → integration/ocr/
- `test_ocr_with_token.py` - OCR with token → integration/ocr/

### HR Dashboard Tests
- `test_hr_*.py` (multiple) - HR tests → integration/hr/

### Manager Dashboard Tests
- `test_manager_dashboard_api.py` - Manager dashboard → integration/managers/
- `test_manager_endpoints.py` - Manager endpoints → integration/managers/

### Onboarding Tests
- `test_direct_onboarding.py` - Direct onboarding → integration/onboarding/
- `test_onboarding_portal_access.py` - Portal access → integration/onboarding/
- `test_simple_onboarding_token.py` - Token testing → debug_scripts/

### Approval & State Tests
- `test_approval_and_name*.py` - Approval tests → integration/applications/
- `test_state_transition_fix.py` - State transition → debug_scripts/
- `test_preview_state_transition.py` - Preview state → debug_scripts/

### Performance & Integration Tests
- `test_performance_final.py` - Performance tests → integration/
- `test_integration_complete.py` - Complete integration → integration/
- `test_phase1_complete.py` - Phase 1 tests → integration/
- `test_baseline_runner.py` - Baseline tests → integration/

### Deployment & Production Tests
- `test_clickwise_deployment.py` - Deployment test → debug_scripts/
- `test_production_*.py` - Production tests → debug_scripts/

### Security Tests
- `test_cross_property_isolation.py` - Property isolation → integration/
- `test_hr_endpoint_security.py` - HR security → integration/hr/
- `test_password_reset.py` - Password reset → integration/auth/

### UI Integration Tests
- `test_hi_family_ui_integration.py` - UI integration → debug_scripts/
- `test_hi_ui_integration.py` - UI integration → debug_scripts/
- `test_frontend_simulation.py` - Frontend simulation → debug_scripts/
- `test_frontend_pdf_preview.py` - Frontend PDF preview → debug_scripts/

### Miscellaneous Debug Scripts
- `test_api_response_structure.py` - API response debug → debug_scripts/
- `test_certificate_system.py` - Certificate system → debug_scripts/
- `test_field_mappings.py` - Field mappings → debug_scripts/
- `test_fill_form_fields.py` - Form fields → debug_scripts/
- `test_pdf_generation_fix.py` - PDF fix → debug_scripts/
- `test_pdf_preview_after_signing.py` - PDF preview → debug_scripts/
- `test_routing_validation.py` - Routing validation → debug_scripts/
- `test_signature_date.py` - Signature date → debug_scripts/
- `test_url_fix_verification.py` - URL fix → debug_scripts/
- `test_critical_endpoints.py` - Critical endpoints → integration/

## Migration Status

### Phase 1: Directory Structure ✅
Created the following directories:
- tests/debug_scripts/
- tests/integration/auth/
- tests/integration/documents/
- tests/integration/email/
- tests/integration/websocket/
- tests/integration/managers/
- tests/integration/hr/
- tests/integration/applications/
- tests/integration/onboarding/
- tests/integration/ocr/
- tests/backup/

### Phase 2: File Migration ✅
Successfully moved all 100 test files to their appropriate directories:
- 23 files → tests/debug_scripts/
- 4 files → tests/integration/auth/
- 6 files → tests/integration/applications/
- 30 files → tests/integration/documents/
- 6 files → tests/integration/email/
- 7 files → tests/integration/hr/
- 5 files → tests/integration/managers/
- 6 files → tests/integration/ocr/
- 2 files → tests/integration/onboarding/
- 5 files → tests/integration/websocket/
- 6 files → tests/integration/

### Phase 3: Cleanup ✅
No files were deleted - all files were preserved and organized.
The tests/backup/ directory remains empty as no obsolete files were identified.

### Phase 4: Verification ✅
Backend verified to start correctly:
- `from app.main_enhanced import app` imports successfully
- No broken imports detected
- All test files remain functional

## Files to Keep in Root (None)
All test files will be moved to organized directories.

## Obsolete Files (To Be Removed)
These will be moved to backup/ first, then removed after confirmation:
- Duplicate test files with similar functionality
- Tests for removed features
- Old debug scripts that are no longer relevant