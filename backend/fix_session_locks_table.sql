-- Fix session_locks table to match what the code expects

-- Add missing ip_address column to session_locks table
ALTER TABLE public.session_locks 
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

-- Add any other potentially missing columns
ALTER TABLE public.session_locks 
ADD COLUMN IF NOT EXISTS browser_fingerprint VARCHAR(255);

-- Verify the table structure matches what's expected
-- The code expects these columns based on the error:
-- - session_id
-- - user_id (locked_by)
-- - lock_type
-- - lock_token
-- - expires_at
-- - created_at
-- - ip_address
-- - browser_fingerprint
-- - metadata (JSONB)