# Migration 007: Manager Review System - Installation Instructions

## ⚠️ IMPORTANT: Run this migration in Supabase SQL Editor

The migration script needs to be run directly in your Supabase dashboard due to connection pooling limitations.

## Steps to Apply Migration:

### 1. Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: `kzommszdhapvqpekpvnt`
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"

### 2. Copy the Migration SQL
Open the file: `backend/supabase/migrations/007_manager_review_system.sql`

Copy the ENTIRE contents of that file.

### 3. Paste and Run
1. Paste the SQL into the Supabase SQL Editor
2. Click "Run" button (or press Cmd/Ctrl + Enter)
3. Wait for execution to complete

### 4. Verify Migration Success
Run this verification query in the SQL Editor:

```sql
-- Check new columns in employees table
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND column_name IN (
    'manager_review_status',
    'manager_review_started_at',
    'manager_review_completed_at',
    'manager_reviewed_by',
    'manager_review_comments',
    'i9_section2_status',
    'i9_section2_completed_at',
    'i9_section2_deadline',
    'i9_section2_completed_by'
);

-- Check manager_review_actions table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'manager_review_actions'
) as table_exists;

-- Check indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('employees', 'manager_review_actions')
AND indexname LIKE '%review%' OR indexname LIKE '%i9_section2%';

-- Check RLS policies
SELECT policyname, tablename, cmd 
FROM pg_policies 
WHERE tablename = 'manager_review_actions';

-- Check views were created
SELECT table_name 
FROM information_schema.views 
WHERE table_name IN ('employees_pending_manager_review', 'i9_section2_compliance_status');
```

### 5. Expected Results

You should see:
- ✅ 9 new columns in `employees` table
- ✅ `manager_review_actions` table exists
- ✅ 4 indexes created
- ✅ 3 RLS policies on `manager_review_actions`
- ✅ 2 views created

## What This Migration Does:

### Database Changes:
1. **Adds columns to `employees` table:**
   - `manager_review_status` - Tracks review progress
   - `manager_review_started_at` - When manager started review
   - `manager_review_completed_at` - When manager completed review
   - `manager_reviewed_by` - Which manager reviewed
   - `manager_review_comments` - Manager's notes
   - `i9_section2_status` - I-9 Section 2 completion status
   - `i9_section2_completed_at` - When I-9 Section 2 was completed
   - `i9_section2_deadline` - Federal deadline (3 business days)
   - `i9_section2_completed_by` - Which manager completed I-9 Section 2

2. **Creates `manager_review_actions` table:**
   - Audit trail of all manager review actions
   - Tracks: started_review, viewed_document, added_note, completed_i9_section2, approved, rejected
   - Includes metadata (IP address, user agent, timestamps)

3. **Creates indexes for performance:**
   - Fast queries for pending reviews
   - Fast queries for I-9 deadline tracking
   - Fast audit trail lookups

4. **Creates RLS policies:**
   - HR can see all review actions
   - Managers can only see reviews for their property employees
   - Managers can only insert their own review actions

5. **Creates helper functions:**
   - `calculate_i9_section2_deadline(start_date)` - Calculates 3 business day deadline
   - `get_i9_deadline_days_remaining(deadline_date)` - Days until deadline

6. **Creates views:**
   - `employees_pending_manager_review` - Quick view of employees awaiting review
   - `i9_section2_compliance_status` - Federal compliance tracking

## Troubleshooting:

### If you get "column already exists" errors:
This is OK - it means some columns were already added. The migration uses `IF NOT EXISTS` to be safe.

### If you get permission errors:
Make sure you're logged in as the project owner or have admin access.

### If functions fail to create:
Check if they already exist:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('calculate_i9_section2_deadline', 'get_i9_deadline_days_remaining');
```

## After Migration:

Once the migration is successful, you can proceed with:
1. ✅ Backend API implementation (Phase 1)
2. ✅ Manager dashboard updates (Phase 2)
3. ✅ Document review interface (Phase 3)

## Need Help?

If you encounter any issues:
1. Copy the error message
2. Check which statement failed
3. Run that statement individually to debug
4. Contact support if needed

---

**Ready to proceed?** Run the migration in Supabase SQL Editor now! 🚀

