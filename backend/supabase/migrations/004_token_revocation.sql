-- Migration: Add Token Revocation Support
-- Purpose: Prevent access to onboarding after completion
-- Date: 2025-10-04
-- Security: Critical - Prevents modification of signed documents

-- ============================================================
-- 1. Add is_active column to onboarding_sessions
-- ============================================================

ALTER TABLE onboarding_sessions 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add comment explaining the column
COMMENT ON COLUMN onboarding_sessions.is_active IS 
'Whether the onboarding session is still active. Set to FALSE when onboarding is completed to prevent re-access and modification of signed documents.';

-- ============================================================
-- 2. Add revoked_at timestamp for audit trail
-- ============================================================

ALTER TABLE onboarding_sessions 
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN onboarding_sessions.revoked_at IS 
'Timestamp when the onboarding token was revoked (when employee completed onboarding).';

-- ============================================================
-- 3. Add revoked_reason for tracking
-- ============================================================

ALTER TABLE onboarding_sessions 
ADD COLUMN IF NOT EXISTS revoked_reason VARCHAR(255);

COMMENT ON COLUMN onboarding_sessions.revoked_reason IS 
'Reason for token revocation (e.g., "onboarding_completed", "manager_revoked", "security_concern").';

-- ============================================================
-- 4. Create indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_is_active 
ON onboarding_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_revoked_at 
ON onboarding_sessions(revoked_at);

-- ============================================================
-- 5. Update existing completed sessions
-- ============================================================

-- Mark all completed sessions as inactive
-- Note: onboarding_sessions doesn't have completed_at, so we use updated_at
UPDATE onboarding_sessions
SET
    is_active = FALSE,
    revoked_at = updated_at,
    revoked_reason = 'onboarding_completed'
WHERE status = 'completed'
  AND (is_active IS NULL OR is_active = TRUE);

-- ============================================================
-- 6. Create function to revoke onboarding token
-- ============================================================

CREATE OR REPLACE FUNCTION revoke_onboarding_token(
    p_employee_id UUID,
    p_reason VARCHAR(255) DEFAULT 'onboarding_completed'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Find active session for employee
    SELECT id INTO v_session_id
    FROM onboarding_sessions
    WHERE employee_id = p_employee_id
      AND is_active = TRUE
    LIMIT 1;
    
    -- If session found, revoke it
    IF v_session_id IS NOT NULL THEN
        UPDATE onboarding_sessions
        SET 
            is_active = FALSE,
            revoked_at = NOW(),
            revoked_reason = p_reason
        WHERE id = v_session_id;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION revoke_onboarding_token IS 
'Revokes an active onboarding token for an employee. Returns TRUE if token was revoked, FALSE if no active token found.';

-- ============================================================
-- 7. Create function to check if token is valid
-- ============================================================

CREATE OR REPLACE FUNCTION is_onboarding_token_valid(
    p_employee_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_active BOOLEAN;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get session details
    SELECT is_active, expires_at INTO v_is_active, v_expires_at
    FROM onboarding_sessions
    WHERE employee_id = p_employee_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Check if session exists, is active, and not expired
    IF v_is_active IS NULL THEN
        RETURN FALSE; -- No session found
    END IF;
    
    IF v_is_active = FALSE THEN
        RETURN FALSE; -- Session revoked
    END IF;
    
    IF v_expires_at < NOW() THEN
        RETURN FALSE; -- Session expired
    END IF;
    
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION is_onboarding_token_valid IS 
'Checks if an onboarding token is valid (exists, active, and not expired) for an employee.';

-- ============================================================
-- 8. Grant permissions
-- ============================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION revoke_onboarding_token TO authenticated;
GRANT EXECUTE ON FUNCTION is_onboarding_token_valid TO authenticated;

-- ============================================================
-- 9. Add trigger to auto-revoke on completion
-- ============================================================

CREATE OR REPLACE FUNCTION auto_revoke_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If status changed to 'completed', revoke the token
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        NEW.is_active := FALSE;
        NEW.revoked_at := NOW();
        IF NEW.revoked_reason IS NULL THEN
            NEW.revoked_reason := 'onboarding_completed';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_revoke_on_completion
    BEFORE UPDATE ON onboarding_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_revoke_on_completion();

COMMENT ON TRIGGER trigger_auto_revoke_on_completion ON onboarding_sessions IS 
'Automatically revokes onboarding token when status changes to completed.';

-- ============================================================
-- 10. Verification queries (for testing)
-- ============================================================

-- Check migration success
DO $$
BEGIN
    -- Verify columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_sessions' 
        AND column_name = 'is_active'
    ) THEN
        RAISE EXCEPTION 'Migration failed: is_active column not created';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'onboarding_sessions' 
        AND column_name = 'revoked_at'
    ) THEN
        RAISE EXCEPTION 'Migration failed: revoked_at column not created';
    END IF;
    
    RAISE NOTICE 'Migration 004_token_revocation completed successfully!';
END $$;

