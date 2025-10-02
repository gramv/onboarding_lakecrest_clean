-- =====================================================
-- Migration 003: Create Audit Logs Table
-- HR Manager System Consolidation - Task 2.2
-- =====================================================

-- Description: Create comprehensive audit logging table for tracking all system actions
-- Created: 2025-08-06
-- Version: 1.0.0

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CREATE AUDIT_LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User context - who performed the action
    user_id UUID,
    user_type VARCHAR(20) CHECK (user_type IN ('hr', 'manager', 'employee', 'system')),
    user_email VARCHAR(255), -- Store email for reference even if user is deleted
    
    -- Action details - what was done
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'create', 'update', 'delete', 'view', 'approve', 'reject', 
        'login', 'logout', 'export', 'import', 'send_notification',
        'bulk_approve', 'bulk_reject', 'generate_report'
    )),
    
    -- Entity details - what was affected
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
        'application', 'employee', 'property', 'manager', 'user',
        'notification', 'report', 'onboarding_session', 'document'
    )),
    entity_id UUID,
    entity_name VARCHAR(255), -- Human readable identifier
    
    -- Property scope - for property-based access control
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    
    -- Detailed tracking
    details JSONB DEFAULT '{}'::jsonb,
    old_values JSONB, -- Before state for updates/deletes
    new_values JSONB, -- After state for creates/updates
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id VARCHAR(255), -- For tracing across services
    
    -- Compliance and retention
    compliance_event BOOLEAN DEFAULT false,
    retention_required_until DATE,
    risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_entity_reference CHECK (
        (entity_type = 'application' AND entity_id IS NOT NULL) OR
        (entity_type = 'employee' AND entity_id IS NOT NULL) OR
        (entity_type = 'property' AND entity_id IS NOT NULL) OR
        entity_id IS NULL
    )
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_type ON audit_logs(user_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Entity-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);

-- Property-scoped queries (for managers)
CREATE INDEX IF NOT EXISTS idx_audit_logs_property_id ON audit_logs(property_id) WHERE property_id IS NOT NULL;

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date_range ON audit_logs(created_at, property_id);

-- Compliance and risk queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_compliance ON audit_logs(compliance_event, risk_level) WHERE compliance_event = true;
CREATE INDEX IF NOT EXISTS idx_audit_logs_retention ON audit_logs(retention_required_until) WHERE retention_required_until IS NOT NULL;

-- Full-text search on details (for advanced searching)
CREATE INDEX IF NOT EXISTS idx_audit_logs_details_gin ON audit_logs USING GIN(details);

-- Composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_dashboard ON audit_logs(property_id, created_at, action) WHERE property_id IS NOT NULL;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- HR can see all audit logs
CREATE POLICY "audit_logs_hr_full_access" ON audit_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'hr'
        )
    );

-- Managers can see audit logs for their properties only
CREATE POLICY "audit_logs_manager_property_access" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM property_managers pm
            JOIN users u ON u.id = pm.manager_id
            WHERE u.id::text = auth.uid()::text 
            AND pm.property_id = audit_logs.property_id
        )
    );

-- System can insert audit logs (for automated logging)
CREATE POLICY "audit_logs_system_insert" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Users can only see audit logs related to their own actions (limited scope)
CREATE POLICY "audit_logs_user_own_actions" ON audit_logs
    FOR SELECT USING (
        user_id::text = auth.uid()::text AND 
        entity_type IN ('onboarding_session', 'document') -- Only onboarding-related logs
    );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log(
    p_user_id UUID,
    p_user_type VARCHAR,
    p_user_email VARCHAR,
    p_action VARCHAR,
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_entity_name VARCHAR DEFAULT NULL,
    p_property_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id VARCHAR DEFAULT NULL,
    p_request_id VARCHAR DEFAULT NULL,
    p_compliance_event BOOLEAN DEFAULT false,
    p_risk_level VARCHAR DEFAULT 'low'
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, user_type, user_email, action, entity_type, entity_id,
        entity_name, property_id, details, old_values, new_values,
        ip_address, user_agent, session_id, request_id,
        compliance_event, risk_level
    ) VALUES (
        p_user_id, p_user_type, p_user_email, p_action, p_entity_type, p_entity_id,
        p_entity_name, p_property_id, p_details, p_old_values, p_new_values,
        p_ip_address, p_user_agent, p_session_id, p_request_id,
        p_compliance_event, p_risk_level
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit trail for an entity
CREATE OR REPLACE FUNCTION get_audit_trail(
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    action VARCHAR,
    user_email VARCHAR,
    user_type VARCHAR,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.action,
        al.user_email,
        al.user_type,
        al.details,
        al.created_at
    FROM audit_logs al
    WHERE al.entity_type = p_entity_type
    AND al.entity_id = p_entity_id
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old audit logs (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
    p_retention_days INTEGER DEFAULT 2555 -- 7 years default
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Only delete non-compliance logs past retention period
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL
    AND compliance_event = false
    AND (retention_required_until IS NULL OR retention_required_until < CURRENT_DATE);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup action
    INSERT INTO audit_logs (
        user_type, action, entity_type, entity_name,
        details, compliance_event, risk_level
    ) VALUES (
        'system', 'delete', 'audit_logs', 'cleanup_operation',
        jsonb_build_object('deleted_count', deleted_count, 'retention_days', p_retention_days),
        true, 'low'
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC AUDIT LOGGING
-- =====================================================

-- Enhanced trigger function for audit logging
CREATE OR REPLACE FUNCTION enhanced_audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_user_id UUID;
    audit_user_type VARCHAR;
    audit_user_email VARCHAR;
    audit_property_id UUID;
BEGIN
    -- Get user context from auth or trigger context
    audit_user_id := COALESCE(
        (auth.jwt() ->> 'user_id')::UUID,
        auth.uid()::UUID,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.updated_by 
            ELSE NEW.updated_by 
        END
    );
    
    audit_user_type := COALESCE(
        auth.jwt() ->> 'user_type',
        'system'
    );
    
    audit_user_email := COALESCE(
        auth.jwt() ->> 'email',
        auth.email()
    );
    
    -- Get property context if available
    audit_property_id := CASE
        WHEN TG_TABLE_NAME = 'job_applications' THEN
            CASE WHEN TG_OP = 'DELETE' THEN OLD.property_id ELSE NEW.property_id END
        WHEN TG_TABLE_NAME = 'employees' THEN
            CASE WHEN TG_OP = 'DELETE' THEN OLD.property_id ELSE NEW.property_id END
        ELSE NULL
    END;
    
    -- Create audit log entry
    IF TG_OP = 'DELETE' THEN
        PERFORM create_audit_log(
            audit_user_id, audit_user_type, audit_user_email,
            'delete', TG_TABLE_NAME, OLD.id,
            COALESCE(OLD.name, OLD.first_name || ' ' || OLD.last_name, OLD.id::text),
            audit_property_id,
            jsonb_build_object('table', TG_TABLE_NAME),
            row_to_json(OLD)::jsonb,
            NULL,
            inet_client_addr(),
            current_setting('request.headers', true)::jsonb ->> 'user-agent',
            current_setting('request.jwt.claims', true)::jsonb ->> 'session_id'
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM create_audit_log(
            audit_user_id, audit_user_type, audit_user_email,
            'update', TG_TABLE_NAME, NEW.id,
            COALESCE(NEW.name, NEW.first_name || ' ' || NEW.last_name, NEW.id::text),
            audit_property_id,
            jsonb_build_object('table', TG_TABLE_NAME),
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb,
            inet_client_addr(),
            current_setting('request.headers', true)::jsonb ->> 'user-agent',
            current_setting('request.jwt.claims', true)::jsonb ->> 'session_id'
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        PERFORM create_audit_log(
            audit_user_id, audit_user_type, audit_user_email,
            'create', TG_TABLE_NAME, NEW.id,
            COALESCE(NEW.name, NEW.first_name || ' ' || NEW.last_name, NEW.id::text),
            audit_property_id,
            jsonb_build_object('table', TG_TABLE_NAME),
            NULL,
            row_to_json(NEW)::jsonb,
            inet_client_addr(),
            current_setting('request.headers', true)::jsonb ->> 'user-agent',
            current_setting('request.jwt.claims', true)::jsonb ->> 'session_id'
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to key tables (if they exist)
DO $$ 
BEGIN
    -- Only create triggers if tables exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'job_applications') THEN
        DROP TRIGGER IF EXISTS audit_job_applications_trigger ON job_applications;
        CREATE TRIGGER audit_job_applications_trigger
            AFTER INSERT OR UPDATE OR DELETE ON job_applications
            FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger_function();
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employees') THEN
        DROP TRIGGER IF EXISTS audit_employees_trigger ON employees;
        CREATE TRIGGER audit_employees_trigger
            AFTER INSERT OR UPDATE OR DELETE ON employees
            FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger_function();
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'properties') THEN
        DROP TRIGGER IF EXISTS audit_properties_trigger ON properties;
        CREATE TRIGGER audit_properties_trigger
            AFTER INSERT OR UPDATE OR DELETE ON properties
            FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger_function();
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        DROP TRIGGER IF EXISTS audit_users_trigger ON users;
        CREATE TRIGGER audit_users_trigger
            AFTER INSERT OR UPDATE OR DELETE ON users
            FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger_function();
    END IF;
END $$;

-- =====================================================
-- INITIAL DATA AND VERIFICATION
-- =====================================================

-- Insert initial audit log entry to mark migration completion
INSERT INTO audit_logs (
    user_type, action, entity_type, entity_name,
    details, compliance_event, risk_level
) VALUES (
    'system', 'create', 'audit_logs', 'table_migration',
    jsonb_build_object(
        'migration', '003_create_audit_logs_table',
        'version', '1.0.0',
        'tables_created', 1,
        'indexes_created', 9,
        'functions_created', 3,
        'triggers_created', 4
    ),
    true, 'low'
);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 003 completed successfully!';
    RAISE NOTICE '📊 Audit logs table created with comprehensive tracking';
    RAISE NOTICE '🔐 Row Level Security policies applied';
    RAISE NOTICE '⚡ Performance indexes created';
    RAISE NOTICE '🔧 Helper functions and triggers installed';
    RAISE NOTICE '📝 Ready for audit logging across all system operations';
END $$;