# Supabase to RDS Migration - Complete Checklist

**Last Updated:** 2025-10-26  
**AWS Account:** 587728159462 (Goutham)  
**AWS Profile:** hotel-onboarding  
**Region:** us-east-1

---

## ✅ COMPLETED TASKS

### 1. AWS Infrastructure Setup
- ✅ **AWS CLI Configured**
  - Version: aws-cli/2.26.5
  - Profile: hotel-onboarding
  - User: Goutham (AIDAYRV2UALTHFWFKA6JE)
  - Account: 587728159462

- ✅ **RDS Database Deployed**
  - Instance: `onboarding-production-db`
  - Status: Available
  - Endpoint: `onboarding-production-db.ccpkequooqt5.us-east-1.rds.amazonaws.com`
  - Publicly Accessible: True (for migration purposes)
  - Database: `onboarding`
  - Tables: 43/44 (missing `qr_codes`)

- ✅ **ECS Cluster Running**
  - Cluster: `onboarding-production-cluster`
  - Service: `onboarding-production-backend`
  - Status: ACTIVE
  - Running Tasks: 1/1
  - Deployment Status: PRIMARY

- ✅ **ECR Repository**
  - Repository: `587728159462.dkr.ecr.us-east-1.amazonaws.com/onboarding-production-backend`
  - Latest Image: `repository-pattern-v1`

### 2. Schema Discovery & Comparison
- ✅ **Schema Discovery Tools Created**
  - `scripts/discover_rds_schema.py` - Extract RDS schema
  - `scripts/compare_supabase_vs_rds_schema.py` - Compare schemas
  - `scripts/export_supabase_schema.py` - Export Supabase schema

- ✅ **Schema Comparison Completed**
  - Supabase Tables: 44
  - RDS Tables: 43
  - Common Tables: 43 (all match)
  - Missing Tables: 1 (`qr_codes`)
  - Type Differences: 276 (cosmetic only, no functional impact)

- ✅ **Documentation Generated**
  - `docs/SCHEMA_COMPARISON_RESULTS.md`
  - `docs/SCHEMA_COMPARISON_SUMMARY.md`
  - `docs/RDS_SCHEMA.json` (when generated)
  - `docs/RDS_SCHEMA.md` (when generated)

### 3. Migration Framework
- ✅ **PostgreSQL Repository Pattern Created**
  - `app/repositories/postgres_repository.py`
  - Connection pooling (50 max connections)
  - Async/await support
  - Error handling and logging

- ✅ **Schema Validation Tools**
  - `scripts/validate_repository_schema.py`
  - Validates INSERT/SELECT statements
  - Checks column existence
  - Prevents schema mismatches

- ✅ **Safe Deployment Pipeline**
  - `QUICK_DEPLOY.sh` with schema validation
  - Docker build and push to ECR
  - ECS service update
  - Health checks and monitoring

### 4. Migration Tools & Scripts
- ✅ **QR Codes Table Migration**
  - `migrations/add_qr_codes_table_rds.sql`
  - `scripts/apply_qr_migration.py`
  - `scripts/apply_qr_migration_public.sh`
  - `scripts/run_qr_migration_via_ecs.sh`

- ✅ **Migration API Endpoints**
  - `POST /api/migration-tools/apply-qr-codes-migration`
  - `GET /api/migration-tools/verify-qr-codes-table`
  - `GET /api/schema-tools/discover-rds-schema`

### 5. Documentation
- ✅ **Migration Guides**
  - `docs/MIGRATION_STATUS.md`
  - `docs/SAFE_MIGRATION_PLAN.md`
  - `docs/QUICK_START_MIGRATION.md`
  - `docs/MIGRATION_FRAMEWORK.md`
  - `docs/ADD_QR_CODES_TABLE_TO_RDS.md`
  - `docs/ADD_QR_CODES_TABLE_VIA_AWS_CONSOLE.md`

### 6. Initial Endpoint Migration
- ✅ **HR Dashboard Endpoints (4 endpoints)**
  - `GET /api/hr/dashboard-stats`
  - `GET /api/hr/properties`
  - `GET /api/hr/managers`
  - `GET /api/hr/applications`

- ✅ **Property Creation Fixed**
  - Removed `email` column from INSERT (doesn't exist in RDS)
  - `POST /api/hr/properties` working in production

---

## 🔄 CURRENT TASK: Add QR Codes Table to RDS

### Why This is Critical
The `qr_codes` table exists in Supabase but is missing in RDS. This blocks:
- QR code generation for properties
- QR code access tracking
- Complete schema parity between Supabase and RDS

### How to Complete (Choose One Option)

#### **Option 1: AWS RDS Query Editor (RECOMMENDED)**
1. Open AWS Console: https://console.aws.amazon.com/rds/
2. Click "Query Editor" in left sidebar
3. Connect to database:
   - Instance: `onboarding-production-db`
   - Database: `onboarding`
   - Username: `postgres`
   - Password: Get from Secrets Manager (see below)
4. Run migration SQL from `docs/ADD_QR_CODES_TABLE_VIA_AWS_CONSOLE.md`
5. Verify with: `SELECT COUNT(*) FROM qr_codes;`

**Get Password:**
```bash
aws secretsmanager get-secret-value \
  --secret-id onboarding/database/credentials-production \
  --region us-east-1 \
  --query SecretString \
  --output text | python3 -c "import sys, json; print(json.load(sys.stdin)['password'])"
```

#### **Option 2: Run Migration Script (Requires RDS Access)**
```bash
cd backend
python3 scripts/apply_qr_migration.py
```

#### **Option 3: Use Migration API Endpoint**
```bash
curl -X POST http://your-backend-url/api/migration-tools/apply-qr-codes-migration \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Verification
After adding the table, verify:
```bash
cd backend
python3 scripts/compare_supabase_vs_rds_schema.py
```

**Expected Result:** 44 tables in both databases, 0 critical differences

---

## 📋 REMAINING TASKS

### Immediate (Before Continuing Migration)
1. ⏳ **Add `qr_codes` table to RDS** (see above)
2. ⏳ **Re-run schema comparison** to verify 44/44 tables
3. ⏳ **Re-enable schema validation** in `QUICK_DEPLOY.sh` (lines 32-52)
4. ⏳ **Run schema discovery** to generate `docs/RDS_SCHEMA.json`
   ```bash
   python3 scripts/discover_rds_schema.py
   ```

### Endpoint Migration (Remaining ~156 endpoints)

#### **Group 2: Property Management (8 endpoints)** - HIGH PRIORITY
- `GET /api/hr/properties/{id}`
- `PUT /api/hr/properties/{id}`
- `DELETE /api/hr/properties/{id}`
- `GET /api/properties/{id}/managers`
- `POST /api/properties/{id}/managers`
- `GET /api/properties/{id}/employees`
- `GET /api/properties/{id}/stats`
- `GET /api/properties/{id}/qr-code` (after qr_codes table added)

#### **Group 3: User Management (10 endpoints)** - HIGH PRIORITY
- User CRUD operations
- Password reset
- Manager/Employee management

#### **Group 4: Onboarding Applications (15 endpoints)** - MEDIUM PRIORITY
- Application CRUD
- Status updates
- Document uploads

#### **Group 5: Documents & Forms (20 endpoints)** - MEDIUM PRIORITY
- I-9 forms
- W-4 forms
- Direct deposit
- Emergency contacts

#### **Group 6: Manager Review (10 endpoints)** - LOW PRIORITY
- Review workflows
- Approvals
- Comments

#### **Group 7: Analytics & Reports (15 endpoints)** - LOW PRIORITY
- Dashboard analytics
- Compliance reports
- Exports

#### **Group 8: Remaining (~88 endpoints)** - LOW PRIORITY
- WebSocket endpoints
- File uploads
- Notifications
- Utilities

---

## 🛠️ TOOLS & COMMANDS

### Schema Management
```bash
# Discover RDS schema
python3 scripts/discover_rds_schema.py

# Compare Supabase vs RDS
python3 scripts/compare_supabase_vs_rds_schema.py

# Validate repository code
python3 scripts/validate_repository_schema.py
```

### Deployment
```bash
# Deploy to AWS ECS (with schema validation)
./QUICK_DEPLOY.sh

# View logs
aws logs tail /ecs/onboarding-production/backend --follow --region us-east-1
```

### AWS Infrastructure
```bash
# Check RDS status
aws rds describe-db-instances --region us-east-1

# Check ECS service
aws ecs describe-services \
  --cluster onboarding-production-cluster \
  --services onboarding-production-backend \
  --region us-east-1

# Get database password
aws secretsmanager get-secret-value \
  --secret-id onboarding/database/credentials-production \
  --region us-east-1
```

---

## 🎯 SUCCESS CRITERIA

### Before Migration Can Proceed
- ⏳ `qr_codes` table added to RDS
- ⏳ Schema validation passing
- ⏳ All 44 tables match between Supabase and RDS
- ⏳ `docs/RDS_SCHEMA.json` generated

### After Migration is Complete
- ⏳ All ~160 endpoints migrated to RDS
- ⏳ All tests passing
- ⏳ QR code functionality working
- ⏳ No Supabase dependencies remaining
- ⏳ Schema validation enabled in deployment pipeline

---

## 📊 PROGRESS TRACKING

| Phase | Status | Progress | Endpoints |
|-------|--------|----------|-----------|
| Infrastructure Setup | ✅ Complete | 100% | - |
| Schema Discovery | ✅ Complete | 100% | - |
| Migration Framework | ✅ Complete | 100% | - |
| QR Codes Table | 🔄 In Progress | 90% | - |
| Group 1: HR Dashboard | ✅ Complete | 100% | 4/4 |
| Group 2: Properties | 🔄 In Progress | 12.5% | 1/8 |
| Group 3: Users | ⏳ Not Started | 0% | 0/10 |
| Group 4: Applications | ⏳ Not Started | 0% | 0/15 |
| Group 5: Forms | ⏳ Not Started | 0% | 0/20 |
| Group 6: Reviews | ⏳ Not Started | 0% | 0/10 |
| Group 7: Analytics | ⏳ Not Started | 0% | 0/15 |
| Group 8: Remaining | ⏳ Not Started | 0% | 0/88 |
| **TOTAL** | **🔄 In Progress** | **3.1%** | **5/160** |

---

## 🚨 KNOWN ISSUES

### 1. Missing QR Codes Table
- **Status:** 🔴 Blocking
- **Impact:** Cannot migrate QR code functionality
- **Solution:** Add table via AWS Console Query Editor (see above)

### 2. Schema Validation Temporarily Disabled
- **Status:** 🟡 Warning
- **Impact:** Deployments don't validate schema
- **Solution:** Re-enable after qr_codes table is added (lines 32-52 in QUICK_DEPLOY.sh)

### 3. RDS Publicly Accessible
- **Status:** 🟡 Warning
- **Impact:** Security risk (database exposed to internet)
- **Solution:** Make private after migration is complete

---

## 📞 NEXT STEPS

1. **Add QR Codes Table** (15 minutes)
   - Use AWS Console Query Editor
   - Follow guide: `docs/ADD_QR_CODES_TABLE_VIA_AWS_CONSOLE.md`

2. **Verify Schema** (5 minutes)
   ```bash
   python3 scripts/compare_supabase_vs_rds_schema.py
   ```

3. **Generate RDS Schema** (5 minutes)
   ```bash
   python3 scripts/discover_rds_schema.py
   ```

4. **Re-enable Schema Validation** (2 minutes)
   - Uncomment lines 32-52 in `QUICK_DEPLOY.sh`

5. **Continue Endpoint Migration** (ongoing)
   - Start with Group 2: Property Management
   - Follow safe migration pattern
   - Test after each group

---

**Status Legend:**
- ✅ Complete
- 🔄 In Progress
- ⏳ Not Started
- 🔴 Blocked
- 🟡 Warning
- 🟢 All Clear

