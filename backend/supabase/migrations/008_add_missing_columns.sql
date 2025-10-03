-- =====================================================
-- Migration 008: Add Missing Columns for Onboarding Completion
-- =====================================================

-- Add onboarding_completed_at column (used when employee clicks "Complete Onboarding")
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Add final signature metadata columns
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS final_signature_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS final_signature_ip VARCHAR(45),
ADD COLUMN IF NOT EXISTS final_signature_user_agent TEXT;

-- Add comments
COMMENT ON COLUMN employees.onboarding_completed_at IS 'Timestamp when employee completed onboarding and clicked Complete Onboarding button';
COMMENT ON COLUMN employees.final_signature_timestamp IS 'Timestamp of final review signature';
COMMENT ON COLUMN employees.final_signature_ip IS 'IP address when final signature was captured';
COMMENT ON COLUMN employees.final_signature_user_agent IS 'User agent when final signature was captured';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

