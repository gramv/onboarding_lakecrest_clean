-- =====================================================
-- Document Access OTPs Table
-- Migration 015: Add OTP table for custom email-based verification
-- =====================================================

-- =====================================================
-- 1. CREATE DOCUMENT ACCESS OTPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS document_access_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  manager_id UUID NOT NULL, -- References auth.users or users table
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  
  -- OTP details
  otp_hash VARCHAR(64) NOT NULL,    -- SHA-256 hash of OTP + manager_id
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  
  -- Security
  attempts INT DEFAULT 0,           -- Track verification attempts
  max_attempts INT DEFAULT 5,       -- Maximum allowed attempts
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_otp_manager_employee ON document_access_otps(manager_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON document_access_otps(expires_at) WHERE NOT used;
CREATE INDEX IF NOT EXISTS idx_otp_hash ON document_access_otps(otp_hash) WHERE NOT used;
CREATE INDEX IF NOT EXISTS idx_otp_created ON document_access_otps(created_at);

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE document_access_otps ENABLE ROW LEVEL SECURITY;

-- Managers can view their own OTPs
CREATE POLICY "Managers can view their own OTPs"
  ON document_access_otps FOR SELECT
  USING (auth.uid() = manager_id);

-- Managers can insert their own OTPs
CREATE POLICY "Managers can insert their own OTPs"
  ON document_access_otps FOR INSERT
  WITH CHECK (auth.uid() = manager_id);

-- Managers can update their own OTPs (for attempt tracking)
CREATE POLICY "Managers can update their own OTPs"
  ON document_access_otps FOR UPDATE
  USING (auth.uid() = manager_id);

-- =====================================================
-- 4. FUNCTION TO INCREMENT ATTEMPTS
-- =====================================================

CREATE OR REPLACE FUNCTION increment_otp_attempts(otp_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE document_access_otps
  SET attempts = attempts + 1
  WHERE id = otp_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. FUNCTION TO CLEANUP EXPIRED OTPS
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM document_access_otps
  WHERE expires_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. COMMENTS
-- =====================================================

COMMENT ON TABLE document_access_otps IS 'OTP verification for secure document access (email-based)';
COMMENT ON COLUMN document_access_otps.otp_hash IS 'SHA-256 hash of OTP combined with manager_id for security';
COMMENT ON COLUMN document_access_otps.attempts IS 'Number of verification attempts (max 5)';
COMMENT ON COLUMN document_access_otps.expires_at IS 'OTP expiration time (10 minutes from creation)';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

