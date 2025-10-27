# Safe Repository Pattern Migration Plan

**Created:** 2025-10-26  
**Status:** Ready for Execution  
**Risk Level:** LOW (with this plan)

---

## 🎯 Objective

Migrate all ~160 endpoints from Supabase client to PostgreSQL Repository Pattern **WITHOUT breaking the database schema or causing downtime**.

---

## ⚠️ Critical Lesson Learned

**Problem:** We deployed repository code that assumed a schema different from the actual RDS database.
- Repository code had `email` column in `properties` table
- Actual RDS database does NOT have `email` column
- Result: Property creation failed in production

**Solution:** Schema-first approach with validation before every deployment.

---

## 📋 Migration Phases

### **Phase 1: Schema Discovery & Documentation** ✅ IN PROGRESS

**Goal:** Document the actual RDS database schema

**Steps:**
1. ✅ Create schema discovery script (`discover_rds_schema.py`)
2. ⏳ Run discovery script to extract actual schema
3. ⏳ Review generated documentation
4. ⏳ Identify all tables used by the application

**Deliverables:**
- `backend/docs/RDS_SCHEMA.json` - Machine-readable schema
- `backend/docs/RDS_SCHEMA.md` - Human-readable documentation
- `backend/app/schema_reference.py` - Python type hints

**Commands:**
```bash
cd /Users/gouthamvemula/onbfinaldev_clean/backend
python scripts/discover_rds_schema.py
```

**Success Criteria:**
- All tables documented
- All columns, types, constraints captured
- Documentation reviewed and accurate

---

### **Phase 2: Schema Validation Framework**

**Goal:** Create automated validation to prevent schema mismatches

**Steps:**
1. ✅ Create validation script (`validate_repository_schema.py`)
2. ⏳ Run validation against current repository code
3. ⏳ Fix all schema mismatches found
4. ⏳ Add validation to deployment pipeline

**Deliverables:**
- `backend/scripts/validate_repository_schema.py` - Validation tool
- `backend/docs/SCHEMA_FIX_SUGGESTIONS.md` - Auto-generated fixes
- Updated `QUICK_DEPLOY.sh` with validation step

**Commands:**
```bash
# Validate before deployment
python scripts/validate_repository_schema.py

# Only deploy if validation passes
if [ $? -eq 0 ]; then
    ./QUICK_DEPLOY.sh
else
    echo "❌ Schema validation failed - fix errors before deploying"
    exit 1
fi
```

**Success Criteria:**
- Validation script detects all schema mismatches
- All current mismatches fixed
- Validation integrated into deployment

---

### **Phase 3: Repository Code Audit & Fix**

**Goal:** Fix all schema mismatches in repository code

**Steps:**
1. ⏳ Run schema validation
2. ⏳ Review all errors and warnings
3. ⏳ Fix repository code to match actual schema
4. ⏳ Re-run validation until clean
5. ⏳ Test all fixed methods

**Tables to Audit:**
- `properties` ✅ FIXED (removed `email` column)
- `users`
- `employees`
- `onboarding_applications`
- `managers`
- `documents`
- `onboarding_progress`
- `emergency_contacts`
- `i9_documents`
- `w4_forms`
- `direct_deposits`

**For Each Table:**
1. Compare repository code with actual schema
2. Fix INSERT statements
3. Fix SELECT statements
4. Fix `_row_to_*` helper methods
5. Update type hints
6. Test CRUD operations

**Success Criteria:**
- Schema validation passes 100%
- All repository methods use correct columns
- No assumptions about schema

---

### **Phase 4: Endpoint Migration Strategy**

**Goal:** Create safe migration plan with testing and rollback

**Migration Groups:**

#### **Group 1: HR Dashboard (4 endpoints)** ✅ COMPLETE
- `GET /api/hr/dashboard-stats`
- `GET /api/hr/properties`
- `GET /api/hr/managers`
- `GET /api/hr/applications`

**Status:** Deployed and working

#### **Group 2: Property Management (8 endpoints)**
- `POST /api/hr/properties` ✅ FIXED
- `GET /api/hr/properties/{id}`
- `PUT /api/hr/properties/{id}`
- `DELETE /api/hr/properties/{id}`
- `GET /api/properties/{id}/managers`
- `POST /api/properties/{id}/managers`
- `GET /api/properties/{id}/employees`
- `GET /api/properties/{id}/stats`

**Priority:** HIGH (core functionality)

#### **Group 3: User Management (10 endpoints)**
- `GET /api/hr/users`
- `POST /api/hr/users`
- `GET /api/hr/users/{id}`
- `PUT /api/hr/users/{id}`
- `DELETE /api/hr/users/{id}`
- `POST /api/hr/users/{id}/reset-password`
- `GET /api/manager/employees`
- `POST /api/manager/employees`
- `GET /api/manager/employees/{id}`
- `PUT /api/manager/employees/{id}`

**Priority:** HIGH

#### **Group 4: Onboarding Applications (15 endpoints)**
- All application CRUD operations
- Application status updates
- Document uploads
- Form submissions

**Priority:** MEDIUM

#### **Group 5: Documents & Forms (20 endpoints)**
- I-9 forms
- W-4 forms
- Direct deposit
- Emergency contacts
- Policy acknowledgments

**Priority:** MEDIUM

#### **Group 6: Manager Review (10 endpoints)**
- Review workflows
- Approval processes
- Comments and feedback

**Priority:** LOW

#### **Group 7: Analytics & Reports (15 endpoints)**
- Dashboard analytics
- Compliance reports
- Export functionality

**Priority:** LOW

#### **Group 8: Remaining Endpoints (~88 endpoints)**
- WebSocket endpoints
- File uploads
- Notifications
- Misc utilities

**Priority:** LOW

---

### **Phase 5: Phased Migration Execution**

**Goal:** Migrate endpoints in phases with validation at each step

**For Each Group:**

1. **Pre-Migration Checklist:**
   - [ ] Schema validation passes
   - [ ] All tables for this group documented
   - [ ] Repository methods tested locally
   - [ ] Rollback plan ready

2. **Migration Steps:**
   - [ ] Update endpoint code to use repository
   - [ ] Keep Supabase fallback (if/else pattern)
   - [ ] Run schema validation
   - [ ] Deploy to production
   - [ ] Test all endpoints in group
   - [ ] Monitor logs for errors
   - [ ] Verify data integrity

3. **Post-Migration Validation:**
   - [ ] All endpoints return correct data
   - [ ] No schema errors in logs
   - [ ] Performance acceptable
   - [ ] No data corruption

4. **Rollback Procedure (if needed):**
   ```python
   # Change this:
   use_direct_postgres = True
   
   # To this:
   use_direct_postgres = False
   ```
   - Redeploy immediately
   - Investigate issue
   - Fix and retry

5. **Success Criteria:**
   - All endpoints in group working
   - No errors in production logs
   - Data integrity verified
   - Performance metrics acceptable

---

## 🛠️ Tools & Scripts

### **Schema Discovery**
```bash
python backend/scripts/discover_rds_schema.py
```
- Connects to RDS
- Extracts complete schema
- Generates documentation

### **Schema Validation**
```bash
python backend/scripts/validate_repository_schema.py
```
- Validates repository code
- Detects schema mismatches
- Generates fix suggestions
- Exit code 0 = pass, 1 = fail

### **Safe Deployment**
```bash
# Updated QUICK_DEPLOY.sh with validation
./QUICK_DEPLOY.sh
```
- Runs schema validation first
- Only deploys if validation passes
- Waits for deployment to stabilize
- Tails logs for errors

---

## 📊 Progress Tracking

| Phase | Status | Progress | ETA |
|-------|--------|----------|-----|
| 1. Schema Discovery | 🟡 In Progress | 50% | 30 min |
| 2. Schema Validation | 🟡 In Progress | 50% | 30 min |
| 3. Repository Audit | ⏳ Not Started | 0% | 2 hours |
| 4. Migration Strategy | ✅ Complete | 100% | Done |
| 5. Phased Migration | ⏳ Not Started | 2% | 8 hours |

**Overall Progress:** 4/160 endpoints (2.5%)

---

## ✅ Success Metrics

- **Zero schema errors** in production logs
- **100% endpoint functionality** maintained
- **No data corruption** or loss
- **Performance** equal or better than Supabase
- **Clean rollback** capability at every step

---

## 🚨 Risk Mitigation

### **Risk 1: Schema Mismatch**
- **Mitigation:** Schema validation before every deployment
- **Detection:** Automated validation script
- **Recovery:** Fix code, re-validate, redeploy

### **Risk 2: Data Corruption**
- **Mitigation:** Read-only operations first, then writes
- **Detection:** Data integrity checks after each group
- **Recovery:** Rollback to Supabase, restore from backup

### **Risk 3: Performance Degradation**
- **Mitigation:** Connection pooling, query optimization
- **Detection:** Monitor response times
- **Recovery:** Optimize queries, add indexes

### **Risk 4: Downtime**
- **Mitigation:** Keep Supabase fallback, blue-green deployment
- **Detection:** Health checks, monitoring
- **Recovery:** Instant rollback via feature flag

---

## 📝 Next Immediate Steps

1. **Run schema discovery** (5 minutes)
   ```bash
   python backend/scripts/discover_rds_schema.py
   ```

2. **Review schema documentation** (15 minutes)
   - Check `backend/docs/RDS_SCHEMA.md`
   - Verify all tables present
   - Note any surprises

3. **Run schema validation** (5 minutes)
   ```bash
   python backend/scripts/validate_repository_schema.py
   ```

4. **Fix schema mismatches** (1-2 hours)
   - Review errors
   - Update repository code
   - Re-validate until clean

5. **Test Group 2 endpoints** (30 minutes)
   - Property CRUD operations
   - Verify with real data
   - Check logs

6. **Deploy Group 2** (15 minutes)
   - Run validation
   - Deploy
   - Test in production

---

## 🎯 Timeline

- **Phase 1-2:** 1 hour (schema discovery + validation)
- **Phase 3:** 2 hours (fix all schema mismatches)
- **Phase 4:** Complete (this document)
- **Phase 5:** 8 hours (migrate all groups)

**Total Estimated Time:** ~11 hours of focused work

**Recommended Schedule:**
- Day 1: Phases 1-3 (schema work)
- Day 2: Groups 1-3 (core functionality)
- Day 3: Groups 4-6 (forms and workflows)
- Day 4: Groups 7-8 (analytics and misc)
- Day 5: Cleanup and optimization

---

## 📞 Support

If you encounter issues:
1. Check logs: `AWS_PROFILE=hotel-onboarding aws logs tail /ecs/onboarding-production/backend --follow --region us-east-1`
2. Run validation: `python backend/scripts/validate_repository_schema.py`
3. Review schema: `cat backend/docs/RDS_SCHEMA.md`
4. Rollback if needed: Set `use_direct_postgres = False`

---

**Ready to proceed? Start with Phase 1!**

