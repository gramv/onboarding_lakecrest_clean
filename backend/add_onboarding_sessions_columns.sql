-- Add missing columns to onboarding_sessions table
-- These columns are referenced in the code but don't exist in the table

ALTER TABLE onboarding_sessions 
ADD COLUMN IF NOT EXISTS single_step_mode BOOLEAN DEFAULT false;

ALTER TABLE onboarding_sessions 
ADD COLUMN IF NOT EXISTS target_step VARCHAR(50);

-- Add an index for the target_step column for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_target_step ON onboarding_sessions(target_step) 
WHERE target_step IS NOT NULL;

-- Add a comment explaining the purpose of these columns
COMMENT ON COLUMN onboarding_sessions.single_step_mode IS 'Indicates if this session is for completing a single form only (via step invitation)';
COMMENT ON COLUMN onboarding_sessions.target_step IS 'Specifies which single step to complete when in single_step_mode';