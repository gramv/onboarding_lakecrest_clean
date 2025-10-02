-- Create table for onboarding session drafts (Save and Continue Later functionality)
CREATE TABLE IF NOT EXISTS onboarding_session_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255) NOT NULL,  -- Can be temp_xxx
    step_id VARCHAR(100) NOT NULL,
    
    -- Draft data
    form_data JSONB NOT NULL DEFAULT '{}',
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    is_draft BOOLEAN DEFAULT TRUE,
    
    -- Recovery information
    resume_token VARCHAR(255) UNIQUE NOT NULL,
    resume_url TEXT,
    resume_email_sent BOOLEAN DEFAULT FALSE,
    resume_email_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Auto-save tracking
    auto_save_count INTEGER DEFAULT 0,
    last_auto_save_at TIMESTAMP WITH TIME ZONE,
    
    -- Session metadata
    ip_address VARCHAR(45),  -- Supports IPv6
    user_agent TEXT,
    language_preference VARCHAR(10) DEFAULT 'en',
    
    -- Email recovery
    recovery_email VARCHAR(255),
    recovery_email_verified BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Indexes for performance
    CONSTRAINT unique_session_step_draft UNIQUE (session_id, step_id, is_draft)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_session_drafts_session_id ON onboarding_session_drafts(session_id);
CREATE INDEX IF NOT EXISTS idx_session_drafts_employee_id ON onboarding_session_drafts(employee_id);
CREATE INDEX IF NOT EXISTS idx_session_drafts_resume_token ON onboarding_session_drafts(resume_token);
CREATE INDEX IF NOT EXISTS idx_session_drafts_expires_at ON onboarding_session_drafts(expires_at);
CREATE INDEX IF NOT EXISTS idx_session_drafts_is_draft ON onboarding_session_drafts(is_draft);

-- Enable Row Level Security
ALTER TABLE onboarding_session_drafts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your auth setup)
-- Policy for service role (full access)
CREATE POLICY "Service role has full access to session drafts"
    ON onboarding_session_drafts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy for anonymous users to access their own drafts via session_id
CREATE POLICY "Users can access their own session drafts"
    ON onboarding_session_drafts
    FOR ALL
    TO anon
    USING (
        -- Can access if they have the matching session_id or resume_token
        session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
        OR 
        resume_token = current_setting('request.jwt.claims', true)::json->>'resume_token'
    )
    WITH CHECK (
        -- Can only insert/update their own drafts
        session_id = current_setting('request.jwt.claims', true)::json->>'session_id'
        OR 
        resume_token = current_setting('request.jwt.claims', true)::json->>'resume_token'
    );

-- Function to clean up expired drafts (can be called periodically)
CREATE OR REPLACE FUNCTION clean_expired_drafts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM onboarding_session_drafts
    WHERE expires_at < NOW() AND is_draft = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to clean expired drafts daily
-- (Requires pg_cron extension)
-- SELECT cron.schedule('clean-expired-drafts', '0 2 * * *', 'SELECT clean_expired_drafts();');

-- Add comments for documentation
COMMENT ON TABLE onboarding_session_drafts IS 'Stores partial form data for onboarding sessions to support Save and Continue Later functionality';
COMMENT ON COLUMN onboarding_session_drafts.session_id IS 'Reference to the main onboarding session';
COMMENT ON COLUMN onboarding_session_drafts.employee_id IS 'Employee ID (can be temporary like temp_xxx)';
COMMENT ON COLUMN onboarding_session_drafts.step_id IS 'The onboarding step this draft is for';
COMMENT ON COLUMN onboarding_session_drafts.form_data IS 'Partial form data in JSON format';
COMMENT ON COLUMN onboarding_session_drafts.completion_percentage IS 'Percentage of form completion (0-100)';
COMMENT ON COLUMN onboarding_session_drafts.resume_token IS 'Secure token for resuming the session via email link';
COMMENT ON COLUMN onboarding_session_drafts.expires_at IS 'When this draft expires and can be cleaned up';