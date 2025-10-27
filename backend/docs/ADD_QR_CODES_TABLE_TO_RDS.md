# Add QR Codes Table to RDS

**Date:** 2025-10-26  
**Status:** ⚠️ REQUIRED - Table missing in RDS

## Problem

The `qr_codes` table exists in Supabase but is **missing in RDS**. This table is actively used by the QR code service (`backend/app/qr_service.py`) to store permanent QR codes for properties.

## Impact

**Current Status:**
- ✅ QR code functionality works in Supabase (current production)
- ❌ QR code functionality will FAIL in RDS without this table
- ⚠️ Migration to RDS cannot be completed without adding this table

**Affected Endpoints:**
- `GET /api/properties/{property_id}/qr-code` - Get or create QR code
- `GET /api/properties/{property_id}/qr-code/printable` - Get printable QR code
- Any property management features that use QR codes

## Solution

Add the `qr_codes` table to RDS using the existing migration script.

### Step 1: Review the Migration Script

The migration script already exists:
- **File:** `database/migrations/add_qr_codes_table.sql`
- **Created:** October 19, 2025
- **Status:** Applied to Supabase, NOT applied to RDS

### Step 2: Apply Migration to RDS

**Option A: Via AWS RDS Query Editor (Recommended)**

1. Go to AWS Console → RDS → Query Editor
2. Connect to your RDS instance
3. Run the SQL from `database/migrations/add_qr_codes_table.sql`

**Option B: Via psql (if you have VPN/bastion access)**

```bash
# Get RDS credentials from AWS Secrets Manager
AWS_PROFILE=hotel-onboarding aws secretsmanager get-secret-value \
    --secret-id onboarding/database/credentials-production \
    --region us-east-1 \
    --query 'SecretString' \
    --output text | jq -r '.url'

# Connect and run migration
psql <connection_url> < database/migrations/add_qr_codes_table.sql
```

**Option C: Via ECS Exec (from within AWS VPC)**

```bash
# Execute from within ECS container
AWS_PROFILE=hotel-onboarding aws ecs execute-command \
  --cluster onboarding-production-cluster \
  --task <task-id> \
  --container backend \
  --command "psql \$DATABASE_URL < /app/database/migrations/add_qr_codes_table.sql" \
  --interactive
```

### Step 3: Verify Migration

After applying the migration, verify the table was created:

```sql
-- Check table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'qr_codes';

-- Check columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'qr_codes'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'qr_codes';

-- Check constraints
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'public.qr_codes'::regclass;
```

Expected results:
- ✅ Table `qr_codes` exists
- ✅ 15 columns (id, property_id, qr_code_data, etc.)
- ✅ 2 indexes (property_id, created_at)
- ✅ 1 unique constraint (unique_property_qr_code)

### Step 4: Migrate Existing Data (if any)

If there are existing QR codes in Supabase, they need to be migrated to RDS:

```sql
-- Export from Supabase
COPY (
    SELECT * FROM qr_codes
) TO '/tmp/qr_codes_export.csv' WITH CSV HEADER;

-- Import to RDS
COPY qr_codes FROM '/tmp/qr_codes_export.csv' WITH CSV HEADER;
```

Or use a data migration script (recommended for production).

## Migration Script Content

The migration creates:

1. **Table:** `public.qr_codes`
   - Stores permanent QR codes for properties
   - One QR code per property (enforced by unique constraint)

2. **Indexes:**
   - `idx_qr_codes_property_id` - Fast lookup by property
   - `idx_qr_codes_created_at` - Chronological queries

3. **Function:** `increment_qr_access_count()`
   - Tracks QR code usage
   - Updates access count and timestamp

4. **Trigger:** `update_qr_codes_updated_at`
   - Auto-updates `updated_at` timestamp

## Testing After Migration

After adding the table to RDS, test QR code functionality:

```python
# Test script
import asyncio
from app.qr_service import qr_service, initialize_qr_service
from app.repositories.postgres_repository import PostgresRepository

async def test_qr_codes():
    # Initialize repository (connects to RDS)
    repo = PostgresRepository()
    await repo.initialize()
    
    # Get a test property
    properties = await repo.get_all_properties()
    if not properties:
        print("No properties found")
        return
    
    property_id = properties[0]['id']
    
    # Initialize QR service with RDS connection
    # (You'll need to adapt this to use RDS instead of Supabase)
    
    # Generate QR code
    qr_data = await qr_service.get_or_create_qr_code(property_id)
    
    print(f"✅ QR Code generated for property {property_id}")
    print(f"   From database: {qr_data.get('from_database', False)}")
    print(f"   Access count: {qr_data.get('access_count', 0)}")

if __name__ == "__main__":
    asyncio.run(test_qr_codes())
```

## Priority

**HIGH PRIORITY** - This table must be added to RDS before:
1. Migrating any QR code-related endpoints
2. Switching production traffic to RDS
3. Decommissioning Supabase

## Next Steps

1. ✅ **DONE:** Identified missing table
2. ⏳ **TODO:** Apply migration to RDS
3. ⏳ **TODO:** Verify table structure
4. ⏳ **TODO:** Migrate existing QR code data (if any)
5. ⏳ **TODO:** Test QR code functionality with RDS
6. ⏳ **TODO:** Update schema comparison to reflect new table

## References

- Migration Script: `database/migrations/add_qr_codes_table.sql`
- QR Service: `backend/app/qr_service.py`
- Documentation: `QR_CODE_FIX_COMPLETE.md`
- Schema Comparison: `backend/docs/SCHEMA_COMPARISON_SUMMARY.md`

