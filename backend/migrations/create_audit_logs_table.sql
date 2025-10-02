-- Create audit_logs table for comprehensive compliance tracking
-- This table records all significant actions in the onboarding system

CREATE TABLE IF NOT EXISTS audit_logs (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- User and session information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id TEXT,
    token_id TEXT,  -- JWT token ID (jti) for tracking token usage
    
    -- Action details
    action TEXT NOT NULL,  -- e.g., 'form_saved', 'navigation', 'signature_added', 'document_generated'
    action_category TEXT NOT NULL,  -- e.g., 'onboarding', 'authentication', 'document', 'admin'
    resource_type TEXT,  -- e.g., 'employee', 'application', 'document', 'property'
    resource_id TEXT,  -- ID of the affected resource
    
    -- Onboarding specific fields
    employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    step_id TEXT,  -- Current onboarding step
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    
    -- Change tracking
    old_data JSONB,  -- Previous state (for updates)
    new_data JSONB,  -- New state (for updates/creates)
    changes JSONB,  -- Specific fields that changed
    
    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,  -- For correlating related actions
    http_method TEXT,
    endpoint TEXT,
    
    -- Response information
    response_status INTEGER,
    error_message TEXT,
    
    -- Compliance metadata
    compliance_flags JSONB,  -- e.g., {"federal_form": true, "i9_section": 1, "signature": true}
    retention_date DATE,  -- When this log can be deleted per retention policy
    
    -- Indexing for efficient queries
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common query patterns
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_employee_id ON audit_logs(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_audit_logs_application_id ON audit_logs(application_id) WHERE application_id IS NOT NULL;
CREATE INDEX idx_audit_logs_session_id ON audit_logs(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_action_category ON audit_logs(action_category);
CREATE INDEX idx_audit_logs_property_id ON audit_logs(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX idx_audit_logs_step_id ON audit_logs(step_id) WHERE step_id IS NOT NULL;
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_compliance ON audit_logs USING GIN (compliance_flags) WHERE compliance_flags IS NOT NULL;
CREATE INDEX idx_audit_logs_retention ON audit_logs(retention_date) WHERE retention_date IS NOT NULL;

-- Create a compound index for common compliance queries
CREATE INDEX idx_audit_logs_compliance_search ON audit_logs(
    employee_id, 
    action_category, 
    timestamp DESC
) WHERE action_category IN ('onboarding', 'document', 'signature');

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for all system actions, especially focused on federal compliance tracking';
COMMENT ON COLUMN audit_logs.compliance_flags IS 'JSON object containing compliance-specific metadata like federal form types, signature types, etc.';
COMMENT ON COLUMN audit_logs.retention_date IS 'Date when this audit log can be deleted according to federal retention requirements';
COMMENT ON COLUMN audit_logs.token_id IS 'JWT token ID (jti claim) to track which token was used for the action';

-- Function to automatically set retention_date based on action type
CREATE OR REPLACE FUNCTION set_audit_retention_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Set retention based on compliance requirements
    IF NEW.compliance_flags->>'federal_form' = 'true' THEN
        -- Federal forms: 3 years after hire or 1 year after termination (we'll use 4 years as safe default)
        NEW.retention_date := CURRENT_DATE + INTERVAL '4 years';
    ELSIF NEW.action_category IN ('signature', 'document') THEN
        -- Digital signatures and documents: 3 years minimum
        NEW.retention_date := CURRENT_DATE + INTERVAL '3 years';
    ELSIF NEW.action_category = 'authentication' THEN
        -- Authentication logs: 1 year
        NEW.retention_date := CURRENT_DATE + INTERVAL '1 year';
    ELSE
        -- Default retention: 2 years
        NEW.retention_date := CURRENT_DATE + INTERVAL '2 years';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set retention dates
CREATE TRIGGER set_audit_retention_date_trigger
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION set_audit_retention_date();

-- Grant appropriate permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;
-- Prevent updates and deletes to maintain audit integrity
-- Only allow deletes through retention policy procedures

-- Sample retention policy procedure (to be run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs
    WHERE retention_date < CURRENT_DATE
    AND retention_date IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup action itself
    INSERT INTO audit_logs (
        action,
        action_category,
        new_data,
        compliance_flags
    ) VALUES (
        'audit_cleanup',
        'admin',
        jsonb_build_object('deleted_count', deleted_count, 'cleanup_date', CURRENT_DATE),
        jsonb_build_object('system_maintenance', true)
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;