-- Complete setup for HR Step Invitations feature
-- Run this script in Supabase SQL Editor

-- 1. Fix token column size (if table already exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'step_invitations' 
               AND column_name = 'token' 
               AND data_type = 'character varying') THEN
        ALTER TABLE step_invitations ALTER COLUMN token TYPE TEXT;
    END IF;
END $$;

-- 2. Add missing columns to onboarding_sessions
ALTER TABLE onboarding_sessions 
ADD COLUMN IF NOT EXISTS single_step_mode BOOLEAN DEFAULT false;

ALTER TABLE onboarding_sessions 
ADD COLUMN IF NOT EXISTS target_step VARCHAR(50);

-- 3. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_target_step ON onboarding_sessions(target_step) 
WHERE target_step IS NOT NULL;

-- 4. Add comments for documentation
COMMENT ON COLUMN onboarding_sessions.single_step_mode IS 'Indicates if this session is for completing a single form only (via step invitation)';
COMMENT ON COLUMN onboarding_sessions.target_step IS 'Specifies which single step to complete when in single_step_mode';
COMMENT ON COLUMN step_invitations.token IS 'JWT token for accessing the invitation - stored as TEXT to accommodate variable length tokens';

-- 5. Refresh the schema cache (important for Supabase)
NOTIFY pgrst, 'reload schema';

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'step_invitations' 
AND column_name = 'token';

SELECT 
    column_name, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'onboarding_sessions' 
AND column_name IN ('single_step_mode', 'target_step');