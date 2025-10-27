# Add QR Codes Table to RDS via AWS Console

## Overview

The `qr_codes` table is missing from RDS and needs to be added before completing the Supabase to RDS migration. Since RDS is in a private subnet, the easiest way to add it is via the AWS RDS Query Editor.

## Steps

### 1. Open AWS RDS Query Editor

1. Go to AWS Console: https://console.aws.amazon.com/rds/
2. Click on "Query Editor" in the left sidebar
3. Select your database:
   - **Database instance**: `onboarding-production-db`
   - **Database name**: `onboarding`
   - **Database username**: `postgres`
4. Click "Connect to database"
5. Enter the password from AWS Secrets Manager (see below)

### 2. Get Database Password

Run this command in your terminal:

```bash
AWS_PROFILE=hotel-onboarding aws secretsmanager get-secret-value \
  --secret-id onboarding/database/credentials-production \
  --region us-east-1 \
  --query SecretString \
  --output text | python3 -c "import sys, json; print(json.load(sys.stdin)['password'])"
```

**Password**: `s:z{&2kePZgsnrt3dNxz*IcnDfagU#9V`

### 3. Run Migration SQL

Copy and paste the following SQL into the Query Editor and click "Run":

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

### 4. Verify Migration

Run this SQL to verify the table was created:

```sql
-- Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'qr_codes'
);

-- Count columns
SELECT COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'qr_codes';

-- Count indexes
SELECT COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'qr_codes';
```

**Expected Results**:
- Table exists: `true`
- Column count: `18`
- Index count: `3` (primary key + 2 indexes)

### 5. Re-run Schema Comparison

After adding the table, re-run the schema comparison to verify Supabase and RDS schemas match:

```bash
cd backend
python3 scripts/compare_supabase_vs_rds_schema.py
```

**Expected Result**: 44 tables in both databases, 0 critical differences

## Alternative: Make RDS Temporarily Public

If you prefer to run the migration from your local machine, you can temporarily make RDS public:

**⚠️ WARNING**: This exposes your database to the internet. Only do this if you understand the security implications.

```bash
cd backend
./scripts/apply_qr_migration_public.sh
```

This script will:
1. Add your IP to the RDS security group
2. Make RDS publicly accessible
3. Apply the migration
4. Make RDS private again
5. Remove your IP from the security group

## Troubleshooting

### Query Editor Connection Issues

If you can't connect via Query Editor:
1. Make sure you're using the correct database name (`onboarding`)
2. Make sure you're using the correct username (`postgres`)
3. Try refreshing the page and connecting again

### Migration Fails

If the migration fails:
1. Check if the table already exists: `SELECT * FROM pg_tables WHERE tablename = 'qr_codes';`
2. If it exists, the migration is already complete
3. If it doesn't exist, check the error message for details

### Schema Comparison Still Shows Differences

If the schema comparison still shows the table as missing:
1. Make sure you ran the migration in the correct database (`onboarding`)
2. Try running the verification SQL above to confirm the table exists
3. Check that you're comparing against the correct RDS instance

## Next Steps

After successfully adding the `qr_codes` table:

1. ✅ Re-run schema comparison to verify schemas match
2. ✅ Continue with endpoint migration from Supabase to RDS
3. ✅ Test QR code functionality with RDS

---

**Need Help?**

If you encounter any issues, check the logs or contact support.

