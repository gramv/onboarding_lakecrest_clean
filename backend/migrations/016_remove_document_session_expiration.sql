-- =====================================================
-- Migration 016: Remove mandatory expiration for manager document sessions
-- Purpose: Allow document access sessions to remain active until manually ended
-- =====================================================

BEGIN;

-- Allow NULL expiration timestamps
ALTER TABLE document_access_sessions
  ALTER COLUMN expires_at DROP NOT NULL;

-- Drop index that assumed every session has an expiration timestamp
DROP INDEX IF EXISTS idx_doc_session_expires;

-- Update cleanup function to ignore NULL expirations
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE document_access_sessions
  SET is_active = FALSE,
      ended_at = NOW()
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Refresh table comment to reflect new behaviour
COMMENT ON TABLE document_access_sessions IS 'Active document viewing sessions created after OTP verification. Sessions remain active until manually ended or explicitly expired.';

COMMIT;

