-- Migration: Add RLS policies for document_access_otps and document_access_sessions
-- Created: 2025-10-04
-- Purpose: Allow managers to create OTP sessions and access employee documents

-- Enable RLS on document_access_otps table (if not already enabled)
ALTER TABLE document_access_otps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Managers can create OTP sessions" ON document_access_otps;
DROP POLICY IF EXISTS "Managers can view their own OTP sessions" ON document_access_otps;
DROP POLICY IF EXISTS "Managers can update their own OTP sessions" ON document_access_otps;

-- Policy: Managers can create OTP sessions
CREATE POLICY "Managers can create OTP sessions"
ON document_access_otps
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be a manager/hr/admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('manager', 'hr', 'admin')
  )
);

-- Policy: Managers can view their own OTP sessions
CREATE POLICY "Managers can view their own OTP sessions"
ON document_access_otps
FOR SELECT
TO authenticated
USING (
  manager_id = auth.uid()
  OR
  -- Or user is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy: Managers can update their own OTP sessions (for verification)
CREATE POLICY "Managers can update their own OTP sessions"
ON document_access_otps
FOR UPDATE
TO authenticated
USING (
  manager_id = auth.uid()
  OR
  -- Or user is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  manager_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Enable RLS on document_access_sessions table (if not already enabled)
ALTER TABLE document_access_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Managers can create access sessions" ON document_access_sessions;
DROP POLICY IF EXISTS "Managers can view their own sessions" ON document_access_sessions;
DROP POLICY IF EXISTS "Managers can update their own sessions" ON document_access_sessions;

-- Policy: Managers can create access sessions
CREATE POLICY "Managers can create access sessions"
ON document_access_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be a manager/hr/admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('manager', 'hr', 'admin')
  )
);

-- Policy: Managers can view their own sessions
CREATE POLICY "Managers can view their own sessions"
ON document_access_sessions
FOR SELECT
TO authenticated
USING (
  manager_id = auth.uid()
  OR
  -- Or user is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy: Managers can update their own sessions (for ending sessions)
CREATE POLICY "Managers can update their own sessions"
ON document_access_sessions
FOR UPDATE
TO authenticated
USING (
  manager_id = auth.uid()
  OR
  -- Or user is admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  manager_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON document_access_otps TO authenticated;
GRANT SELECT, INSERT, UPDATE ON document_access_sessions TO authenticated;

-- Add helpful comment
COMMENT ON TABLE document_access_otps IS 'Stores OTP codes for secure document access. Managers must verify identity before viewing employee documents.';
COMMENT ON TABLE document_access_sessions IS 'Tracks active document access sessions. Sessions expire after 30 minutes of inactivity.';

