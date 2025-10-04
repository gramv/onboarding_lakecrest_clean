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
  access_type VARCHAR(50) NOT NULL, -- 'upload', 'view', 'download', 'delete', 'generate_url'
  
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

