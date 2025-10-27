# QR Codes Table Migration - Execution Plan

**Created:** 2025-10-26  
**Estimated Time:** 20 minutes  
**Difficulty:** Easy  
**Risk Level:** Low (read-only verification first, then single table creation)

---

## 📋 Overview

**Goal:** Add the missing `qr_codes` table to RDS to achieve 100% schema parity with Supabase.

**Current Status:**
- Supabase: 44 tables (including `qr_codes`)
- RDS: 43 tables (missing `qr_codes`)
- Impact: QR code functionality cannot be migrated until this table exists

**Why This Matters:**
- QR codes are used for employee onboarding (scan to start application)
- Each property gets a unique QR code
- QR codes track access counts and analytics
- This is the ONLY critical schema difference blocking migration

---

## 🎯 Task Breakdown

### Task 1: Get RDS Database Password (2 minutes)

**What:** Retrieve the database password from AWS Secrets Manager

**Why:** You need the password to connect to RDS via Query Editor

**How:**
```bash
# Run this command in your terminal
aws secretsmanager get-secret-value \
  --secret-id onboarding/database/credentials-production \
  --region us-east-1 \
  --query SecretString \
  --output text | python3 -c "import sys, json; print(json.load(sys.stdin)['password'])"
```

**Expected Output:**
```
s:z{&2kePZgsnrt3dNxz*IcnDfagU#9V
```

**Success Criteria:**
- ✅ Password displayed in terminal
- ✅ Copy password to clipboard for next step

**Troubleshooting:**
- If command fails, check AWS CLI is configured: `aws sts get-caller-identity`
- If secret not found, verify secret name in AWS Console

---

### Task 2: Connect to RDS via AWS Query Editor (3 minutes)

**What:** Open AWS Console and connect to the RDS database

**Why:** Query Editor allows you to run SQL directly on RDS from the AWS Console

**How:**

1. **Open AWS Console:**
   - URL: https://console.aws.amazon.com/rds/
   - Make sure you're in region: `us-east-1`

2. **Navigate to Query Editor:**
   - Click "Query Editor" in the left sidebar
   - Or direct link: https://console.aws.amazon.com/rds/home?region=us-east-1#query-editor:

3. **Connect to Database:**
   - **Database instance:** Select `onboarding-production-db`
   - **Database name:** `onboarding`
   - **Database username:** `postgres`
   - Click "Connect to database"

4. **Enter Password:**
   - Paste the password from Task 1
   - Click "Connect"

**Expected Result:**
- ✅ Query Editor opens with a SQL input area
- ✅ Connection status shows "Connected"
- ✅ Database name shows "onboarding"

**Success Criteria:**
- ✅ Successfully connected to database
- ✅ Can see query input area
- ✅ No connection errors

**Troubleshooting:**
- If connection fails, verify RDS instance is running: `aws rds describe-db-instances --region us-east-1`
- If password rejected, re-run Task 1 to get fresh password
- If Query Editor not available, check IAM permissions

---

### Task 3: Execute QR Codes Table Migration SQL (5 minutes)

**What:** Run the SQL script to create the `qr_codes` table

**Why:** This creates the table with all necessary columns, indexes, triggers, and functions

**How:**

1. **Get the SQL Script:**
   - Open file: `backend/docs/ADD_QR_CODES_TABLE_VIA_AWS_CONSOLE.md`
   - Copy lines 38-108 (the entire SQL block)
   - Or use the SQL below

2. **Paste into Query Editor:**
   - Paste the SQL into the query input area
   - Review the SQL (it's safe - only creates, doesn't modify existing data)

3. **Execute:**
   - Click "Run" button
   - Wait for execution to complete (~5-10 seconds)

**SQL to Execute:**
```sql
-- ============================================
-- QR Codes Table Migration - RDS Compatible
-- ============================================

-- Create QR codes table
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    
    -- QR Code Data
    qr_code_data TEXT NOT NULL,
    qr_code_url TEXT NOT NULL,
    application_url TEXT NOT NULL,
    
    -- Storage
    storage_path TEXT,
    public_url TEXT,
    
    -- Metadata
    format VARCHAR(10) DEFAULT 'PNG',
    size_width INTEGER,
    size_height INTEGER,
    version INTEGER DEFAULT 1,
    error_correction VARCHAR(1) DEFAULT 'L',
    
    -- Tracking
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_by UUID,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_property_qr_code UNIQUE(property_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_qr_codes_property_id ON public.qr_codes(property_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_generated_at ON public.qr_codes(generated_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_qr_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_qr_codes_updated_at
    BEFORE UPDATE ON public.qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_codes_updated_at();

-- Create access count function
CREATE OR REPLACE FUNCTION increment_qr_access_count(qr_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.qr_codes
    SET 
        access_count = access_count + 1,
        last_accessed_at = NOW()
    WHERE id = qr_id;
END;
$$ LANGUAGE plpgsql;
```

**Expected Result:**
- ✅ Query executes successfully
- ✅ Message: "Query executed successfully"
- ✅ No errors displayed

**Success Criteria:**
- ✅ All SQL statements executed without errors
- ✅ Table created
- ✅ Indexes created
- ✅ Triggers created
- ✅ Functions created

**Troubleshooting:**
- If "table already exists" error: Table is already there, skip to Task 4
- If "permission denied" error: Check database user has CREATE permissions
- If "syntax error": Copy SQL exactly as shown above

---

### Task 4: Verify QR Codes Table Was Created Successfully (3 minutes)

**What:** Run verification queries to confirm the table structure is correct

**Why:** Ensures the table was created with all expected columns and indexes

**How:**

1. **Check Table Exists:**
```sql
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'qr_codes'
);
```
**Expected:** `true`

2. **Count Columns:**
```sql
SELECT COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'qr_codes';
```
**Expected:** `18` columns

3. **Count Indexes:**
```sql
SELECT COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'qr_codes';
```
**Expected:** `3` indexes (1 primary key + 2 regular indexes)

4. **List All Columns:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'qr_codes'
ORDER BY ordinal_position;
```
**Expected:** 18 rows showing all columns

**Success Criteria:**
- ✅ Table exists: `true`
- ✅ Column count: `18`
- ✅ Index count: `3`
- ✅ All expected columns present

**Troubleshooting:**
- If table doesn't exist, re-run Task 3
- If column count wrong, check SQL was executed completely
- If index count wrong, check triggers and indexes were created

---

### Task 5: Re-run Schema Comparison (5 minutes)

**What:** Run the schema comparison script to verify both databases now match

**Why:** Confirms that RDS now has all 44 tables matching Supabase

**How:**

1. **Open Terminal:**
```bash
cd /Users/gouthamvemula/onbfinaldev_clean/backend
```

2. **Run Comparison Script:**
```bash
python3 scripts/compare_supabase_vs_rds_schema.py
```

3. **Review Output:**
   - Look for: "Supabase tables: 44"
   - Look for: "RDS tables: 44"
   - Look for: "Tables ONLY in Supabase:" (should be empty)

**Expected Output:**
```
================================================================================
SCHEMA COMPARISON: Supabase vs RDS
================================================================================

✅ Found 44 tables in Supabase
✅ Found 44 tables in RDS schema file

================================================================================
COMPARISON RESULTS
================================================================================

⚠️  Found 276 differences:
  (All type differences - cosmetic only)

================================================================================
SUMMARY
================================================================================
Supabase tables: 44
RDS tables: 44
Differences: 276 (type formatting only)

qr_codes                       Supabase: ✅  RDS: ✅
```

**Success Criteria:**
- ✅ Both databases show 44 tables
- ✅ `qr_codes` shows ✅ for both Supabase and RDS
- ✅ No "Tables ONLY in Supabase" errors
- ✅ Only type differences remain (cosmetic)

**Troubleshooting:**
- If still shows 43 RDS tables, the SQL file needs updating (not critical)
- If qr_codes still missing, re-run Task 3 and 4
- Type differences are expected and safe to ignore

---

### Task 6: Re-enable Schema Validation in Deployment Pipeline (2 minutes)

**What:** Uncomment the schema validation code in the deployment script

**Why:** Re-enables automatic schema validation before every deployment to prevent future schema mismatches

**How:**

1. **Open File:**
```bash
code backend/QUICK_DEPLOY.sh
# Or use any text editor
```

2. **Find Lines 32-52:**
   - Look for the commented-out schema validation block
   - It starts with: `# if [ -f "docs/RDS_SCHEMA.json" ]; then`

3. **Uncomment the Block:**
   - Remove the `#` from lines 40-52
   - Keep line 34 as a comment (the warning message)

4. **Save File**

**Before:**
```bash
# Step 0.5: Schema Validation (TEMPORARILY DISABLED)
echo -e "${BLUE}🔍 Step 0.5: Schema Validation...${NC}"
echo -e "${YELLOW}⚠️  Temporarily disabled - deploying migration tools${NC}"
echo ""

# if [ -f "docs/RDS_SCHEMA.json" ]; then
#     if python3 scripts/validate_repository_schema.py; then
#         echo -e "${GREEN}✅ Schema validation PASSED - safe to deploy${NC}"
#         echo ""
#     else
#         echo -e "${RED}❌ SCHEMA VALIDATION FAILED${NC}"
#         echo -e "${RED}DEPLOYMENT ABORTED${NC}"
#         exit 1
#     fi
# else
#     echo -e "${YELLOW}⚠️  Schema file not found - skipping validation${NC}"
#     echo ""
# fi
```

**After:**
```bash
# Step 0.5: Schema Validation
echo -e "${BLUE}🔍 Step 0.5: Schema Validation...${NC}"

if [ -f "docs/RDS_SCHEMA.json" ]; then
    if python3 scripts/validate_repository_schema.py; then
        echo -e "${GREEN}✅ Schema validation PASSED - safe to deploy${NC}"
        echo ""
    else
        echo -e "${RED}❌ SCHEMA VALIDATION FAILED${NC}"
        echo -e "${RED}DEPLOYMENT ABORTED${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Schema file not found - skipping validation${NC}"
    echo ""
fi
```

**Success Criteria:**
- ✅ Lines 40-52 uncommented
- ✅ File saved
- ✅ No syntax errors

---

## ✅ Final Verification Checklist

After completing all tasks, verify:

- [ ] RDS database password retrieved successfully
- [ ] Connected to RDS via AWS Query Editor
- [ ] QR codes table creation SQL executed without errors
- [ ] Table exists with 18 columns and 3 indexes
- [ ] Schema comparison shows 44/44 tables
- [ ] `qr_codes` table shows ✅ in both databases
- [ ] Schema validation re-enabled in QUICK_DEPLOY.sh

---

## 🎉 Success!

Once all tasks are complete:

1. **Schema Parity Achieved:** ✅ 44/44 tables match
2. **Migration Unblocked:** ✅ Can now migrate QR code endpoints
3. **Safety Enabled:** ✅ Schema validation will prevent future mismatches

---

## 📊 Next Steps After Completion

1. **Generate RDS Schema Documentation:**
   ```bash
   python3 scripts/discover_rds_schema.py
   ```

2. **Test QR Code Functionality:**
   - Create a test property
   - Generate QR code
   - Verify it's stored in RDS

3. **Continue Endpoint Migration:**
   - Start with Group 2: Property Management
   - Follow safe migration pattern
   - Test after each endpoint

---

## 🚨 Rollback Plan (If Needed)

If something goes wrong:

1. **Drop the table:**
```sql
DROP TABLE IF EXISTS public.qr_codes CASCADE;
```

2. **Re-run Task 3** with corrected SQL

3. **Verify again** with Task 4

---

## 📞 Support

If you encounter issues:
- Check AWS Console for RDS status
- Review CloudWatch logs for errors
- Verify database credentials are correct
- Consult: `backend/docs/ADD_QR_CODES_TABLE_VIA_AWS_CONSOLE.md`

---

**Estimated Total Time:** 20 minutes  
**Difficulty:** Easy  
**Risk:** Low (only creates one table, doesn't modify existing data)

