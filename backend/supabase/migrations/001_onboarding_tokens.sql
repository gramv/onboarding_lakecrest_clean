-- Create onboarding_tokens table for managing employee onboarding access
CREATE TABLE IF NOT EXISTS onboarding_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    token_type VARCHAR(50) NOT NULL DEFAULT 'onboarding', -- 'onboarding' or 'form_update'
    
    -- Access details
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    
    -- Session tracking
    session_id UUID,
    form_type VARCHAR(100), -- For form_update tokens
    
    -- Security
    ip_address VARCHAR(50),
    user_agent TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    
    -- Constraints
    CONSTRAINT fk_employee_id FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_session_id FOREIGN KEY (session_id) REFERENCES onboarding_sessions(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_onboarding_tokens_token ON onboarding_tokens(token);
CREATE INDEX idx_onboarding_tokens_employee_id ON onboarding_tokens(employee_id);
CREATE INDEX idx_onboarding_tokens_expires_at ON onboarding_tokens(expires_at);
CREATE INDEX idx_onboarding_tokens_is_used ON onboarding_tokens(is_used);

-- Create RLS policies
ALTER TABLE onboarding_tokens ENABLE ROW LEVEL SECURITY;

-- HR can view all tokens
CREATE POLICY "HR can view all onboarding tokens" ON onboarding_tokens
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'hr');

-- Managers can view tokens they created
CREATE POLICY "Managers can view their created tokens" ON onboarding_tokens
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'manager' AND created_by = auth.uid());

-- Managers can create tokens
CREATE POLICY "Managers can create onboarding tokens" ON onboarding_tokens
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' IN ('manager', 'hr'));

-- System can update tokens (when used)
CREATE POLICY "System can update onboarding tokens" ON onboarding_tokens
    FOR UPDATE
    USING (TRUE)
    WITH CHECK (TRUE);