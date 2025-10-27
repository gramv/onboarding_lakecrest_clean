# 155 Endpoint Migration Plan - Supabase to RDS
## Safe, Schema-Preserving Migration Strategy

**Created:** 2025-10-26  
**Status:** Ready to Execute  
**Current Progress:** 5/160 endpoints (3.1%)  
**Remaining:** 155 endpoints

---

## 🎯 MIGRATION GOALS

### Primary Objectives
1. **Zero Schema Changes** - Use existing RDS schema (50 tables confirmed)
2. **Zero Downtime** - Gradual migration with fallback capability
3. **Zero Data Loss** - All operations tested before production
4. **Maintain Federal Compliance** - I-9/W-4 integrity preserved

### Success Criteria
- ✅ All endpoints use PostgresRepository instead of supabase_service
- ✅ All tests passing after each migration group
- ✅ Production logs show no errors
- ✅ Federal compliance maintained (I-9 deadlines, signatures, etc.)

---

## 📊 CURRENT STATE ANALYSIS

### What's Already Migrated (5 endpoints)
1. `GET /api/hr/dashboard-stats` - Uses db_pool directly
2. `GET /api/hr/properties` - Uses PostgresRepository
3. `GET /api/hr/managers` - Uses PostgresRepository
4. `GET /api/hr/applications` - Uses PostgresRepository
5. `POST /api/hr/properties` - Uses PostgresRepository (fixed email column issue)

### Migration Pattern Discovered
```python
# OLD PATTERN (Supabase)
supabase_service = get_enhanced_supabase_service()
result = await supabase_service.get_properties()

# NEW PATTERN (RDS via db_pool)
async with supabase_service.db_pool.acquire() as conn:
    rows = await conn.fetch("SELECT * FROM properties")
```

### Key Infrastructure Ready
- ✅ PostgresRepository class (60+ methods)
- ✅ Connection pool (db_pool) initialized in main_enhanced.py
- ✅ RDS database (50 tables including qr_codes)
- ✅ Schema validation tools
- ✅ Safe deployment pipeline (QUICK_DEPLOY.sh)

---

## 🗺️ MIGRATION STRATEGY

### Approach: Gradual Refactoring (Strangler Fig Pattern)

**Phase 1: Add RDS Support (Keep Supabase)**
- Add db_pool queries alongside existing Supabase calls
- Use feature flag: `use_direct_postgres` (already exists!)
- Test both paths work

**Phase 2: Switch Default to RDS**
- Set `use_direct_postgres = True` by default
- Keep Supabase as fallback
- Monitor production logs

**Phase 3: Remove Supabase Fallback**
- After 1 week of stable RDS operation
- Remove Supabase client code
- Clean up imports

---

## 📋 MIGRATION GROUPS (Priority Order)

### GROUP 1: HR Dashboard ✅ COMPLETE (4 endpoints)
**Status:** 100% migrated  
**Endpoints:**
- `GET /api/hr/dashboard-stats`
- `GET /api/hr/properties`
- `GET /api/hr/managers`
- `GET /api/hr/applications`

---

### GROUP 2: Property Management (8 endpoints) - HIGH PRIORITY
**Estimated Time:** 2 hours  
**Risk Level:** LOW (simple CRUD operations)

**Endpoints:**
1. `GET /api/hr/properties/{id}` - Get single property
2. `PUT /api/hr/properties/{id}` - Update property
3. `DELETE /api/hr/properties/{id}` - Delete property
4. `GET /api/properties/{id}/managers` - Get property managers
5. `POST /api/properties/{id}/managers` - Assign manager
6. `DELETE /api/properties/{id}/managers/{manager_id}` - Remove manager
7. `GET /api/properties/{id}/employees` - Get property employees
8. `GET /api/properties/{id}/stats` - Property statistics

**Tables Used:** `properties`, `property_managers`, `employees`

**Migration Steps:**
1. Update property CRUD in main_enhanced.py
2. Add db_pool queries for manager assignments
3. Test property creation/update/delete
4. Test manager assignment flow
5. Deploy and monitor

---

### GROUP 3: User Management (10 endpoints) - HIGH PRIORITY
**Estimated Time:** 2 hours  
**Risk Level:** MEDIUM (authentication critical)

**Endpoints:**
1. `GET /api/users` - List all users
2. `GET /api/users/{id}` - Get user by ID
3. `POST /api/users` - Create user
4. `PUT /api/users/{id}` - Update user
5. `DELETE /api/users/{id}` - Delete user
6. `GET /api/users/by-email/{email}` - Get user by email
7. `POST /api/auth/password-reset-request` - Request password reset
8. `POST /api/auth/password-reset-confirm` - Confirm password reset
9. `GET /api/users/{id}/properties` - Get user properties
10. `PUT /api/users/{id}/role` - Update user role

**Tables Used:** `users`, `password_reset_tokens`, `property_managers`

**Migration Steps:**
1. Update user CRUD operations
2. Migrate password reset flow
3. Test authentication still works
4. Test role-based access control
5. Deploy and monitor auth logs

---

### GROUP 4: QR Code Management (5 endpoints) - HIGH PRIORITY
**Estimated Time:** 1 hour  
**Risk Level:** LOW (new table confirmed exists)

**Endpoints:**
1. `GET /api/properties/{id}/qr-code` - Get property QR code
2. `POST /api/properties/{id}/qr-code` - Generate QR code
3. `GET /api/qr-codes/{code}` - Validate QR code
4. `POST /api/qr-codes/{code}/track-access` - Track QR access
5. `GET /api/qr-codes/{code}/stats` - QR code statistics

**Tables Used:** `qr_codes` (18 columns, 5 indexes - CONFIRMED EXISTS)

**Migration Steps:**
1. Implement QR code generation using db_pool
2. Add access tracking
3. Test QR code scanning flow
4. Deploy and test with mobile devices

---

### GROUP 5: Job Applications (15 endpoints) - MEDIUM PRIORITY
**Estimated Time:** 3 hours  
**Risk Level:** MEDIUM (workflow critical)

**Endpoints:**
1. `GET /api/applications` - List applications
2. `GET /api/applications/{id}` - Get application
3. `POST /api/applications` - Create application
4. `PUT /api/applications/{id}` - Update application
5. `DELETE /api/applications/{id}` - Delete application
6. `POST /api/applications/{id}/approve` - Approve application
7. `POST /api/applications/{id}/reject` - Reject application
8. `POST /api/applications/{id}/talent-pool` - Move to talent pool
9. `GET /api/applications/{id}/status-history` - Get status history
10. `GET /api/applications/by-property/{property_id}` - Filter by property
11. `GET /api/applications/by-status/{status}` - Filter by status
12. `POST /api/applications/{id}/review` - Submit review
13. `GET /api/applications/{id}/documents` - Get application documents
14. `POST /api/applications/{id}/documents` - Upload document
15. `DELETE /api/applications/{id}/documents/{doc_id}` - Delete document

**Tables Used:** `job_applications`, `application_status_history`, `application_reviews`, `documents`

**Migration Steps:**
1. Migrate application CRUD
2. Migrate approval/rejection workflow
3. Migrate status history tracking
4. Test complete application flow
5. Deploy and monitor

---

### GROUP 6: Onboarding Sessions (12 endpoints) - MEDIUM PRIORITY
**Estimated Time:** 3 hours  
**Risk Level:** HIGH (core onboarding flow)

**Endpoints:**
1. `GET /api/onboarding/sessions` - List sessions
2. `GET /api/onboarding/sessions/{id}` - Get session
3. `POST /api/onboarding/sessions` - Create session
4. `PUT /api/onboarding/sessions/{id}` - Update session
5. `POST /api/onboarding/sessions/{id}/complete-step` - Complete step
6. `GET /api/onboarding/sessions/{id}/progress` - Get progress
7. `POST /api/onboarding/sessions/{id}/save-draft` - Save draft
8. `GET /api/onboarding/sessions/{id}/draft` - Get draft
9. `POST /api/onboarding/sessions/{id}/expire` - Expire session
10. `POST /api/onboarding/sessions/{id}/extend` - Extend session
11. `GET /api/onboarding/tokens/{token}` - Validate token
12. `POST /api/onboarding/tokens/{token}/use` - Use token

**Tables Used:** `onboarding_sessions`, `onboarding_progress`, `onboarding_session_drafts`, `onboarding_tokens`

**Migration Steps:**
1. Migrate session management
2. Migrate progress tracking
3. Migrate draft save/restore
4. Test complete onboarding flow
5. Deploy and monitor session logs

---

### GROUP 7: Federal Forms (I-9, W-4) (20 endpoints) - HIGH PRIORITY
**Estimated Time:** 4 hours  
**Risk Level:** CRITICAL (federal compliance)

**I-9 Endpoints (10):**
1. `GET /api/forms/i9/{employee_id}` - Get I-9 form
2. `POST /api/forms/i9/section1` - Save Section 1
3. `POST /api/forms/i9/section2` - Save Section 2
4. `GET /api/forms/i9/{employee_id}/section1` - Get Section 1
5. `GET /api/forms/i9/{employee_id}/section2` - Get Section 2
6. `POST /api/forms/i9/{employee_id}/documents` - Upload I-9 documents
7. `GET /api/forms/i9/{employee_id}/documents` - Get I-9 documents
8. `POST /api/forms/i9/{employee_id}/verify` - Verify I-9
9. `GET /api/forms/i9/{employee_id}/compliance` - Check compliance
10. `GET /api/forms/i9/{employee_id}/pdf` - Generate I-9 PDF

**W-4 Endpoints (10):**
1. `GET /api/forms/w4/{employee_id}` - Get W-4 form
2. `POST /api/forms/w4` - Save W-4 form
3. `PUT /api/forms/w4/{id}` - Update W-4
4. `GET /api/forms/w4/{employee_id}/pdf` - Generate W-4 PDF
5. `POST /api/forms/w4/{id}/sign` - Sign W-4
6. `GET /api/forms/direct-deposit/{employee_id}` - Get direct deposit
7. `POST /api/forms/direct-deposit` - Save direct deposit
8. `GET /api/forms/emergency-contact/{employee_id}` - Get emergency contact
9. `POST /api/forms/emergency-contact` - Save emergency contact
10. `GET /api/forms/{employee_id}/all` - Get all forms

**Tables Used:** `i9_forms`, `i9_section2`, `i9_documents`, `w4_forms`, `employees`, `signed_documents`

**Migration Steps:**
1. Migrate I-9 Section 1 (employee portion)
2. Migrate I-9 Section 2 (employer portion)
3. Migrate I-9 deadline tracking
4. Migrate W-4 forms
5. Test signature capture and timestamps
6. Test PDF generation
7. Verify federal compliance requirements
8. Deploy with extra monitoring

---

### GROUP 8: Manager Review (15 endpoints) - MEDIUM PRIORITY
**Estimated Time:** 3 hours  
**Risk Level:** MEDIUM (manager workflow)

**Endpoints:**
1. `GET /api/manager/review/pending` - Get pending reviews
2. `GET /api/manager/review/employees/{id}` - Get employee for review
3. `POST /api/manager/review/employees/{id}/approve` - Approve employee
4. `POST /api/manager/review/employees/{id}/reject` - Reject employee
5. `POST /api/manager/review/employees/{id}/request-changes` - Request changes
6. `GET /api/manager/review/employees/{id}/documents` - Get documents
7. `POST /api/manager/review/employees/{id}/documents/approve` - Approve document
8. `POST /api/manager/review/employees/{id}/i9-section2` - Complete I-9 Section 2
9. `GET /api/manager/review/stats` - Manager review stats
10. `POST /api/manager/edits/track` - Track manager edits
11. `GET /api/manager/edits/patterns` - Get edit patterns
12. `GET /api/manager/employer-profile` - Get employer profile
13. `PUT /api/manager/employer-profile` - Update employer profile
14. `POST /api/manager/document-access/request-otp` - Request OTP
15. `POST /api/manager/document-access/verify-otp` - Verify OTP

**Tables Used:** `employees_pending_manager_review`, `manager_review_actions`, `form_field_edits`, `manager_edit_patterns`, `employer_profiles`, `document_access_otps`

**Migration Steps:**
1. Migrate pending review queue
2. Migrate approval/rejection workflow
3. Migrate edit tracking
4. Migrate OTP document access
5. Test complete manager review flow
6. Deploy and monitor

---

### GROUP 9: Documents & Storage (18 endpoints) - MEDIUM PRIORITY
**Estimated Time:** 3 hours  
**Risk Level:** MEDIUM (file operations)

**Endpoints:**
1. `POST /api/documents/upload` - Upload document
2. `GET /api/documents/{id}` - Get document
3. `DELETE /api/documents/{id}` - Delete document
4. `GET /api/documents/{id}/download` - Download document
5. `POST /api/documents/{id}/approve` - Approve document
6. `GET /api/documents/by-employee/{employee_id}` - Get employee documents
7. `GET /api/documents/by-type/{type}` - Get documents by type
8. `POST /api/generated-pdfs` - Save generated PDF
9. `GET /api/generated-pdfs/{id}` - Get generated PDF
10. `GET /api/generated-pdfs/by-employee/{employee_id}` - Get employee PDFs
11. `POST /api/signed-documents` - Save signed document
12. `GET /api/signed-documents/{id}` - Get signed document
13. `GET /api/signed-documents/by-employee/{employee_id}` - Get employee signed docs
14. `POST /api/document-access/create-session` - Create access session
15. `GET /api/document-access/verify-session` - Verify session
16. `POST /api/document-access/end-session` - End session
17. `GET /api/document-access/log` - Get access log
18. `POST /api/document-approvals` - Create approval

**Tables Used:** `documents`, `generated_pdfs`, `signed_documents`, `document_access_sessions`, `document_access_log`, `document_approvals`

**Migration Steps:**
1. Migrate document metadata storage
2. Keep Supabase Storage for files (no change)
3. Migrate access tracking
4. Migrate approval workflow
5. Test upload/download flow
6. Deploy and monitor

---

### GROUP 10: Analytics & Notifications (20 endpoints) - LOW PRIORITY
**Estimated Time:** 3 hours  
**Risk Level:** LOW (non-critical features)

**Endpoints:**
1. `POST /api/analytics/events` - Track event
2. `GET /api/analytics/events` - Get events
3. `GET /api/analytics/dashboard` - Dashboard analytics
4. `GET /api/analytics/summary` - Daily summary
5. `GET /api/analytics/engagement` - User engagement
6. `POST /api/notifications` - Create notification
7. `GET /api/notifications` - Get notifications
8. `PUT /api/notifications/{id}/read` - Mark as read
9. `DELETE /api/notifications/{id}` - Delete notification
10. `GET /api/notifications/unread-count` - Unread count
11. `POST /api/audit-logs` - Create audit log
12. `GET /api/audit-logs` - Get audit logs
13. `GET /api/audit-logs/by-user/{user_id}` - User audit logs
14. `GET /api/audit-logs/by-entity/{entity_id}` - Entity audit logs
15. `GET /api/navigation/events` - Navigation events
16. `POST /api/navigation/track` - Track navigation
17. `GET /api/session-locks` - Get session locks
18. `POST /api/session-locks/acquire` - Acquire lock
19. `POST /api/session-locks/release` - Release lock
20. `GET /api/unsaved-changes` - Get unsaved changes

**Tables Used:** `analytics_events`, `daily_analytics_summary`, `user_engagement_metrics`, `notifications`, `audit_logs`, `navigation_events`, `session_locks`, `unsaved_changes`

**Migration Steps:**
1. Migrate analytics tracking
2. Migrate notifications
3. Migrate audit logging
4. Test analytics dashboard
5. Deploy and monitor

---

### GROUP 11: Remaining Utilities (28 endpoints) - LOW PRIORITY
**Estimated Time:** 4 hours  
**Risk Level:** LOW

**Includes:**
- WebSocket endpoints (5)
- Email recipient management (5)
- HR settings (5)
- Password management (3)
- Token management (5)
- Step invitations (5)

**Migration Steps:**
1. Group by feature
2. Migrate in small batches
3. Test each batch
4. Deploy incrementally

---

## 🛡️ SAFETY MEASURES

### Before Each Migration Group
1. ✅ Review tables used by endpoints
2. ✅ Confirm tables exist in RDS (use count_rds_tables.py)
3. ✅ Check column names match (use schema comparison)
4. ✅ Write migration code
5. ✅ Test locally if possible
6. ✅ Create rollback plan

### During Migration
1. ✅ Keep Supabase fallback active
2. ✅ Use feature flag (`use_direct_postgres`)
3. ✅ Monitor error logs
4. ✅ Test each endpoint after migration
5. ✅ Verify data integrity

### After Each Migration Group
1. ✅ Run integration tests
2. ✅ Check production logs for errors
3. ✅ Verify federal compliance (for I-9/W-4)
4. ✅ Monitor performance metrics
5. ✅ Update progress tracking

---

## 📈 PROGRESS TRACKING

| Group | Endpoints | Status | Progress | Est. Time | Risk |
|-------|-----------|--------|----------|-----------|------|
| 1. HR Dashboard | 4 | ✅ Complete | 100% | - | LOW |
| 2. Properties | 8 | ⏳ Not Started | 0% | 2h | LOW |
| 3. Users | 10 | ⏳ Not Started | 0% | 2h | MEDIUM |
| 4. QR Codes | 5 | ⏳ Not Started | 0% | 1h | LOW |
| 5. Applications | 15 | ⏳ Not Started | 0% | 3h | MEDIUM |
| 6. Sessions | 12 | ⏳ Not Started | 0% | 3h | HIGH |
| 7. Federal Forms | 20 | ⏳ Not Started | 0% | 4h | CRITICAL |
| 8. Manager Review | 15 | ⏳ Not Started | 0% | 3h | MEDIUM |
| 9. Documents | 18 | ⏳ Not Started | 0% | 3h | MEDIUM |
| 10. Analytics | 20 | ⏳ Not Started | 0% | 3h | LOW |
| 11. Utilities | 28 | ⏳ Not Started | 0% | 4h | LOW |
| **TOTAL** | **155** | **🔄 In Progress** | **0%** | **28h** | - |

**Total Estimated Time:** 28 hours (~3.5 days of focused work)

---

## 🚀 RECOMMENDED EXECUTION ORDER

### Week 1: Core Infrastructure (Groups 2-4)
- Day 1: Property Management (8 endpoints)
- Day 2: User Management (10 endpoints)
- Day 3: QR Codes (5 endpoints)
- **Total:** 23 endpoints

### Week 2: Applications & Onboarding (Groups 5-6)
- Day 1-2: Job Applications (15 endpoints)
- Day 3: Onboarding Sessions (12 endpoints)
- **Total:** 27 endpoints

### Week 3: Federal Compliance (Group 7)
- Day 1-2: I-9 Forms (10 endpoints)
- Day 3: W-4 & Other Forms (10 endpoints)
- **Total:** 20 endpoints

### Week 4: Manager & Documents (Groups 8-9)
- Day 1-2: Manager Review (15 endpoints)
- Day 3: Documents (18 endpoints)
- **Total:** 33 endpoints

### Week 5: Analytics & Cleanup (Groups 10-11)
- Day 1-2: Analytics & Notifications (20 endpoints)
- Day 3: Remaining Utilities (28 endpoints)
- **Total:** 48 endpoints

### Week 6: Testing & Cleanup
- Remove Supabase fallback code
- Final integration testing
- Performance optimization
- Documentation updates

---

## ✅ COMPLETION CHECKLIST

- [ ] All 155 endpoints migrated to RDS
- [ ] All Supabase fallback code removed
- [ ] All tests passing
- [ ] Federal compliance verified (I-9/W-4)
- [ ] Production logs clean (no errors)
- [ ] Performance metrics acceptable
- [ ] Documentation updated
- [ ] Schema validation re-enabled
- [ ] RDS made private (remove public access)
- [ ] Supabase project archived

---

**Next Step:** Start with Group 2 (Property Management) - 8 endpoints, 2 hours, LOW risk

