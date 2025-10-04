# ✅ CORRECTED MIGRATION - RUN THIS

**Issue Fixed:** The original migration referenced a `managers` table that doesn't exist.  
**Solution:** Updated to use the `users` table with `role` and `property_id` columns.

---

## 🎯 **RUN THIS SQL IN SUPABASE**

### **Step 1: Go to Supabase SQL Editor**

1. Open your Supabase Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### **Step 2: Copy This SQL**

Copy the entire SQL from: **`backend/migrations/001_create_audit_trail_CORRECTED.sql`**

Or copy from below:

```sql
-- ============================================
-- Document Access Audit Trail Migration
-- Created: 2025-10-03
-- Purpose: Track all document access for compliance
-- CORRECTED: Uses actual schema (users table, not managers table)
-- ============================================

-- Create document_access_log table
CREATE TABLE IF NOT EXISTS document_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Document information
  document_id UUID,
  document_path TEXT NOT NULL,
  document_type VARCHAR(100),
  
  -- Access information
  accessed_by UUID,
  access_type VARCHAR(50) NOT NULL,
  
  -- Request information
  ip_address VARCHAR(45),
  user_agent TEXT,
  user_role VARCHAR(50),
  
  -- Context
  property_id UUID,
  employee_id UUID,
  
  -- Expiration tracking (for signed URLs)
  expires_at TIMESTAMP,
  
  -- Timestamp
  accessed_at TIMESTAMP DEFAULT NOW(),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_document_access_log_document 
  ON document_access_log(document_id) 
  WHERE document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_access_log_user 
  ON document_access_log(accessed_by) 
  WHERE accessed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_access_log_time 
  ON document_access_log(accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_access_log_employee 
  ON document_access_log(employee_id) 
  WHERE employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_access_log_property 
  ON document_access_log(property_id) 
  WHERE property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_access_log_type 
  ON document_access_log(access_type);

CREATE INDEX IF NOT EXISTS idx_document_access_log_document_type 
  ON document_access_log(document_type) 
  WHERE document_type IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access (backend)
DROP POLICY IF EXISTS "Service role full access to audit log" ON document_access_log;
CREATE POLICY "Service role full access to audit log"
ON document_access_log FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: HR can view all audit logs
DROP POLICY IF EXISTS "HR can view all audit logs" ON document_access_log;
CREATE POLICY "HR can view all audit logs"
ON document_access_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'hr'
  )
);

-- Policy: Managers can view audit logs for their property
DROP POLICY IF EXISTS "Managers can view property audit logs" ON document_access_log;
CREATE POLICY "Managers can view property audit logs"
ON document_access_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'manager'
    AND users.property_id = document_access_log.property_id
  )
);

-- Add comments for documentation
COMMENT ON TABLE document_access_log IS 'Audit trail for all document access operations';
COMMENT ON COLUMN document_access_log.document_id IS 'UUID of the document (if exists in database)';
COMMENT ON COLUMN document_access_log.document_path IS 'Storage path of the document';
COMMENT ON COLUMN document_access_log.document_type IS 'Type of document (i9, w4, direct-deposit, etc.)';
COMMENT ON COLUMN document_access_log.access_type IS 'Type of access: upload, view, download, delete, generate_url';
COMMENT ON COLUMN document_access_log.accessed_by IS 'User ID who performed the action';
COMMENT ON COLUMN document_access_log.ip_address IS 'IP address of the request';
COMMENT ON COLUMN document_access_log.user_agent IS 'User agent string from request';
COMMENT ON COLUMN document_access_log.expires_at IS 'Expiration time for signed URLs';
COMMENT ON COLUMN document_access_log.metadata IS 'Additional context (JSON)';

-- Verification query
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'document_access_log'
ORDER BY policyname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Audit trail table created successfully';
  RAISE NOTICE '✅ Indexes created for fast queries';
  RAISE NOTICE '✅ RLS policies enabled';
  RAISE NOTICE '✅ Ready to log document access';
  RAISE NOTICE '';
  RAISE NOTICE 'Schema used:';
  RAISE NOTICE '  - users table (with role and property_id columns)';
  RAISE NOTICE '  - No managers table needed';
END $$;
```

### **Step 3: Run the Query**

Click **Run** (or press Cmd/Ctrl + Enter)

### **Step 4: Verify Success**

You should see output like:

```
✅ Audit trail table created successfully
✅ Indexes created for fast queries
✅ RLS policies enabled
✅ Ready to log document access

Schema used:
  - users table (with role and property_id columns)
  - No managers table needed
```

And a table showing the 3 RLS policies created.

---

## ✅ **WHAT WAS FIXED**

### **Original (WRONG):**
```sql
-- Referenced non-existent 'managers' table
SELECT 1 FROM managers
WHERE managers.user_id = auth.uid()
AND managers.property_id = document_access_log.property_id
```

### **Corrected (RIGHT):**
```sql
-- Uses actual 'users' table with role column
SELECT 1 FROM users
WHERE users.id = auth.uid()
AND users.role = 'manager'
AND users.property_id = document_access_log.property_id
```

---

## 🎯 **AFTER RUNNING THE MIGRATION**

The migration is safe to run - it uses `CREATE TABLE IF NOT EXISTS` and `DROP POLICY IF EXISTS`, so you can run it multiple times without errors.

Once successful, let me know and I'll continue with the remaining features!

---

## 🐛 **IF YOU GET ANY ERRORS**

Share the error message and I'll fix it immediately.

