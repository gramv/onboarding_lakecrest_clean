# Supabase to RDS Migration Status

## Current Status: 🟡 READY FOR QR CODES TABLE MIGRATION

Last Updated: 2025-10-26

---

## ✅ Completed Tasks

### 1. Schema Discovery & Comparison
- ✅ Created schema discovery tool for RDS
- ✅ Created schema comparison tool (Supabase vs RDS)
- ✅ Compared all 44 Supabase tables vs 43 RDS tables
- ✅ Identified 1 missing table: `qr_codes`
- ✅ Confirmed 276 type differences are cosmetic only (no functional impact)

### 2. Safe Migration Framework
- ✅ Created PostgreSQL Repository Pattern
- ✅ Created schema validation tool
- ✅ Integrated schema validation into deployment pipeline
- ✅ Created comprehensive documentation

### 3. Migration Tools
- ✅ Created migration SQL for `qr_codes` table (RDS-compatible)
- ✅ Created migration API endpoint (`/api/migration-tools/apply-qr-codes-migration`)
- ✅ Created schema tools API endpoint (`/api/schema-tools/discover-rds-schema`)
- ✅ Deployed backend with migration tools

### 4. Documentation
- ✅ Schema comparison results documented
- ✅ Migration instructions created
- ✅ AWS Console migration guide created

---

## 🔄 Current Task: Add QR Codes Table to RDS

### Why This is Needed

The `qr_codes` table exists in Supabase but is missing in RDS. This table is required for:
- Generating permanent QR codes for each property
- Tracking QR code access and usage
- Storing QR code metadata and URLs

### How to Complete This Task

**Option 1: AWS RDS Query Editor (RECOMMENDED)**

Follow the step-by-step guide:
- **File**: `backend/docs/ADD_QR_CODES_TABLE_VIA_AWS_CONSOLE.md`
- **Time**: ~5 minutes
- **Difficulty**: Easy

**Option 2: Make RDS Temporarily Public**

⚠️ **WARNING**: This exposes your database to the internet temporarily.

```bash
cd backend
./scripts/apply_qr_migration_public.sh
```

**Why Option 1 is Recommended**:
- RDS is in a private subnet (good security practice)
- Cannot be accessed from the internet even when marked as "publicly accessible"
- AWS Query Editor runs inside AWS VPC, so it can access private RDS
- No need to modify security settings

---

## 📊 Schema Comparison Results

### Summary
- **Supabase tables**: 44
- **RDS tables**: 43
- **Common tables**: 43 (all match perfectly)
- **Missing tables**: 1 (`qr_codes`)
- **Type differences**: 276 (cosmetic only, no functional impact)

### Critical Differences

| Issue | Status | Priority | Impact |
|-------|--------|----------|--------|
| Missing `qr_codes` table | 🔴 Not Fixed | HIGH | QR code functionality will fail |

### Non-Critical Differences

| Issue | Count | Status | Impact |
|-------|-------|--------|--------|
| Type parsing differences | 276 | ✅ Acceptable | None (cosmetic only) |

**Example Type Differences**:
- Supabase reports: `character varying(255)`
- RDS SQL file has: `character varying`
- **Impact**: None - both are functionally identical

---

## 📋 Next Steps

### Immediate (Before Migration)

1. **Add `qr_codes` table to RDS**
   - Follow guide: `backend/docs/ADD_QR_CODES_TABLE_VIA_AWS_CONSOLE.md`
   - Estimated time: 5 minutes

2. **Verify migration was successful**
   ```bash
   cd backend
   python3 scripts/compare_supabase_vs_rds_schema.py
   ```
   - Expected: 44 tables in both databases, 0 critical differences

3. **Re-enable schema validation in deployment**
   - Uncomment lines 32-52 in `backend/QUICK_DEPLOY.sh`

### After QR Codes Table is Added

4. **Continue endpoint migration**
   - Migrate remaining ~160 endpoints from Supabase to RDS
   - Use Repository Pattern for all database operations
   - Run schema validation before each deployment

5. **Test QR code functionality**
   - Create a property
   - Verify QR code is generated and stored in RDS
   - Test QR code scanning and access tracking

6. **Complete migration**
   - Switch all endpoints to use RDS
   - Decommission Supabase connection
   - Update documentation

---

## 🔧 Tools & Scripts

### Schema Tools
- `backend/scripts/discover_rds_schema.py` - Extract RDS schema
- `backend/scripts/compare_supabase_vs_rds_schema.py` - Compare schemas
- `backend/scripts/validate_repository_schema.py` - Validate repository code

### Migration Tools
- `backend/scripts/apply_qr_migration.py` - Apply migration (requires RDS access)
- `backend/scripts/apply_qr_migration_public.sh` - Temporarily make RDS public and apply migration
- `backend/migrations/add_qr_codes_table_rds.sql` - Migration SQL

### API Endpoints
- `GET /api/schema-tools/discover-rds-schema` - Get RDS schema from within VPC
- `POST /api/migration-tools/apply-qr-codes-migration` - Apply migration (admin only)
- `GET /api/migration-tools/verify-qr-codes-table` - Verify table structure

---

## 📚 Documentation

### Schema & Migration
- `backend/docs/SCHEMA_COMPARISON_RESULTS.md` - Detailed comparison results
- `backend/docs/SCHEMA_COMPARISON_SUMMARY.md` - Executive summary
- `backend/docs/ADD_QR_CODES_TABLE_TO_RDS.md` - Migration instructions (all options)
- `backend/docs/ADD_QR_CODES_TABLE_VIA_AWS_CONSOLE.md` - AWS Console guide (recommended)

### Repository Pattern
- `backend/docs/REPOSITORY_PATTERN.md` - Architecture overview
- `backend/docs/MIGRATION_GUIDE.md` - Endpoint migration guide
- `backend/docs/SCHEMA_VALIDATION.md` - Schema validation guide

---

## 🎯 Success Criteria

### Before Migration Can Proceed
- ✅ Schema comparison complete
- ⏳ `qr_codes` table added to RDS (PENDING)
- ⏳ Schema validation passing (PENDING)
- ⏳ All 44 tables match between Supabase and RDS (PENDING)

### After Migration is Complete
- ⏳ All ~160 endpoints migrated to RDS
- ⏳ All tests passing
- ⏳ QR code functionality working
- ⏳ No Supabase dependencies remaining

---

## 🚨 Known Issues

### RDS Connectivity
- **Issue**: RDS is in private subnet, not accessible from internet
- **Impact**: Cannot run migrations from local machine
- **Solution**: Use AWS RDS Query Editor or migration API endpoints

### Schema Validation Temporarily Disabled
- **Issue**: Schema validation disabled in `QUICK_DEPLOY.sh` to deploy migration tools
- **Impact**: Deployments don't validate schema before deploying
- **Solution**: Re-enable after `qr_codes` table is added (lines 32-52)

---

## 📞 Support

If you encounter any issues:

1. Check the documentation files in `backend/docs/`
2. Review the schema comparison results
3. Verify RDS connectivity
4. Check AWS CloudWatch logs for backend errors

---

**Status Legend**:
- ✅ Complete
- 🔄 In Progress
- ⏳ Pending
- 🔴 Blocked
- 🟡 Ready to Start
- 🟢 All Clear

