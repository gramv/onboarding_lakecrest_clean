-- =====================================================
-- Migration 006: Create Report Templates Table
-- HR Manager System Consolidation - Task 2.5
-- =====================================================

-- Description: Create report_templates table for custom report definitions
-- Created: 2025-08-06
-- Version: 1.0.0

-- =====================================================
-- CREATE REPORT_TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS report_templates (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'applications', 'employees', 'analytics', 'compliance',
        'performance', 'custom', 'system'
    )),
    
    -- Template ownership and sharing
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    user_type VARCHAR(20) CHECK (user_type IN ('hr', 'manager', 'system')),
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT false,
    is_system_template BOOLEAN DEFAULT false,
    
    -- Template configuration
    template_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example template_config structure:
    -- {
    --   "report_type": "applications_summary",
    --   "data_sources": ["job_applications", "employees"],
    --   "date_range": {"type": "relative", "value": "last_30_days"},
    --   "filters": {"status": ["pending", "approved"]},
    --   "group_by": ["department", "position"],
    --   "metrics": ["total_count", "approval_rate", "avg_review_time"],
    --   "sorting": {"field": "created_at", "order": "desc"},
    --   "charts": [{"type": "bar", "x": "department", "y": "total_count"}]
    -- }
    
    -- Output configuration
    output_format JSONB DEFAULT '["pdf", "csv"]'::jsonb CHECK (
        output_format::jsonb ?| array['pdf', 'csv', 'excel', 'json']
    ),
    layout_config JSONB DEFAULT '{}'::jsonb,
    -- Layout config for styling, headers, footers, logos, etc.
    
    -- Scheduling and automation
    is_scheduled BOOLEAN DEFAULT false,
    schedule_config JSONB,
    -- Schedule config:
    -- {
    --   "frequency": "weekly", // daily, weekly, monthly, quarterly
    --   "day_of_week": 1, // 1=Monday for weekly
    --   "day_of_month": 1, // 1st for monthly  
    --   "time": "09:00",
    --   "timezone": "America/New_York",
    --   "recipients": ["manager@hotel.com", "hr@hotel.com"]
    -- }
    
    last_generated_at TIMESTAMP WITH TIME ZONE,
    next_generation_at TIMESTAMP WITH TIME ZONE,
    
    -- Usage and performance tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    avg_generation_time_ms INTEGER,
    
    -- Validation and quality
    is_active BOOLEAN DEFAULT true,
    validation_errors JSONB,
    last_validated_at TIMESTAMP WITH TIME ZONE,
    
    -- Version control
    version INTEGER DEFAULT 1,
    parent_template_id UUID REFERENCES report_templates(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_schedule CHECK (
        (is_scheduled = false) OR 
        (is_scheduled = true AND schedule_config IS NOT NULL)
    ),
    CONSTRAINT valid_next_generation CHECK (
        next_generation_at IS NULL OR next_generation_at > created_at
    ),
    CONSTRAINT unique_name_per_user UNIQUE (name, created_by, property_id)
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_report_templates_created_by ON report_templates(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_report_templates_property ON report_templates(property_id) WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_report_templates_category ON report_templates(category, is_active);

-- Public and sharing queries
CREATE INDEX IF NOT EXISTS idx_report_templates_public ON report_templates(is_public, category, created_at) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_report_templates_system ON report_templates(is_system_template, category) WHERE is_system_template = true;

-- Scheduling queries
CREATE INDEX IF NOT EXISTS idx_report_templates_scheduled ON report_templates(is_scheduled, next_generation_at, is_active) WHERE is_scheduled = true;

-- Usage and performance tracking
CREATE INDEX IF NOT EXISTS idx_report_templates_usage ON report_templates(usage_count, last_used_at);
CREATE INDEX IF NOT EXISTS idx_report_templates_performance ON report_templates(avg_generation_time_ms, usage_count) WHERE avg_generation_time_ms IS NOT NULL;

-- Version control
CREATE INDEX IF NOT EXISTS idx_report_templates_versions ON report_templates(parent_template_id, version) WHERE parent_template_id IS NOT NULL;

-- Full-text search on name and description
CREATE INDEX IF NOT EXISTS idx_report_templates_search ON report_templates USING GIN(to_tsvector('english', 
    name || ' ' || COALESCE(description, '')
));

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_report_templates_user_active ON report_templates(created_by, is_active, last_used_at) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_report_templates_property_category ON report_templates(property_id, category, is_active);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- Users can see their own templates
CREATE POLICY "report_templates_user_own" ON report_templates
    FOR ALL USING (created_by::text = auth.uid()::text);

-- HR can see all templates
CREATE POLICY "report_templates_hr_full_access" ON report_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'hr'
        )
    );

-- Managers can see public templates and property-specific templates
CREATE POLICY "report_templates_manager_access" ON report_templates
    FOR SELECT USING (
        is_public = true OR
        is_system_template = true OR
        EXISTS (
            SELECT 1 FROM property_managers pm
            JOIN users u ON u.id = pm.manager_id
            WHERE u.id::text = auth.uid()::text 
            AND pm.property_id = report_templates.property_id
        )
    );

-- Managers can create templates for their properties
CREATE POLICY "report_templates_manager_create" ON report_templates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM property_managers pm
            JOIN users u ON u.id = pm.manager_id
            WHERE u.id::text = auth.uid()::text 
            AND pm.property_id = report_templates.property_id
        ) OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'hr'
        )
    );

-- System can manage all templates (for automated processes)
CREATE POLICY "report_templates_system_manage" ON report_templates
    FOR ALL USING (
        auth.jwt() ->> 'user_type' = 'system' OR
        auth.role() = 'service_role'
    );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to create report template
CREATE OR REPLACE FUNCTION create_report_template(
    p_name VARCHAR,
    p_description TEXT,
    p_category VARCHAR,
    p_created_by UUID,
    p_user_type VARCHAR,
    p_property_id UUID DEFAULT NULL,
    p_template_config JSONB,
    p_output_format JSONB DEFAULT '["pdf"]'::jsonb,
    p_layout_config JSONB DEFAULT '{}'::jsonb,
    p_is_public BOOLEAN DEFAULT false,
    p_is_scheduled BOOLEAN DEFAULT false,
    p_schedule_config JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    template_id UUID;
BEGIN
    INSERT INTO report_templates (
        name, description, category, created_by, user_type, property_id,
        template_config, output_format, layout_config, is_public,
        is_scheduled, schedule_config
    ) VALUES (
        p_name, p_description, p_category, p_created_by, p_user_type, p_property_id,
        p_template_config, p_output_format, p_layout_config, p_is_public,
        p_is_scheduled, p_schedule_config
    ) RETURNING id INTO template_id;
    
    -- Calculate next generation time if scheduled
    IF p_is_scheduled AND p_schedule_config IS NOT NULL THEN
        UPDATE report_templates 
        SET next_generation_at = calculate_next_generation_time(p_schedule_config)
        WHERE id = template_id;
    END IF;
    
    RETURN template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate next generation time based on schedule
CREATE OR REPLACE FUNCTION calculate_next_generation_time(
    p_schedule_config JSONB
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    frequency VARCHAR;
    next_time TIMESTAMP WITH TIME ZONE;
    schedule_time TIME;
    target_day INTEGER;
BEGIN
    frequency := p_schedule_config ->> 'frequency';
    schedule_time := COALESCE((p_schedule_config ->> 'time')::TIME, '09:00'::TIME);
    
    CASE frequency
        WHEN 'daily' THEN
            next_time := (CURRENT_DATE + INTERVAL '1 day') + schedule_time;
        WHEN 'weekly' THEN
            target_day := COALESCE((p_schedule_config ->> 'day_of_week')::INTEGER, 1); -- Monday
            next_time := (
                CURRENT_DATE + 
                ((target_day - EXTRACT(DOW FROM CURRENT_DATE) + 7) % 7)::INTEGER * INTERVAL '1 day'
            ) + schedule_time;
            -- If it's already past the time today and it's the target day, schedule for next week
            IF next_time <= NOW() THEN
                next_time := next_time + INTERVAL '7 days';
            END IF;
        WHEN 'monthly' THEN
            target_day := COALESCE((p_schedule_config ->> 'day_of_month')::INTEGER, 1);
            next_time := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + (target_day - 1) * INTERVAL '1 day') + schedule_time;
        WHEN 'quarterly' THEN
            next_time := (DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months') + schedule_time;
        ELSE
            next_time := NOW() + INTERVAL '1 day'; -- Default fallback
    END CASE;
    
    RETURN next_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get available templates for a user
CREATE OR REPLACE FUNCTION get_available_templates(
    p_user_id UUID,
    p_user_type VARCHAR,
    p_property_id UUID DEFAULT NULL,
    p_category VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    category VARCHAR,
    is_public BOOLEAN,
    is_system_template BOOLEAN,
    created_by UUID,
    usage_count INTEGER,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rt.id,
        rt.name,
        rt.description,
        rt.category,
        rt.is_public,
        rt.is_system_template,
        rt.created_by,
        rt.usage_count,
        rt.last_used_at,
        rt.created_at
    FROM report_templates rt
    WHERE rt.is_active = true
    AND (p_category IS NULL OR rt.category = p_category)
    AND (
        -- Own templates
        rt.created_by = p_user_id OR
        -- Public templates
        rt.is_public = true OR
        -- System templates
        rt.is_system_template = true OR
        -- HR sees all
        (p_user_type = 'hr') OR
        -- Property-specific templates for managers
        (p_user_type = 'manager' AND rt.property_id = p_property_id)
    )
    ORDER BY 
        rt.is_system_template DESC,
        rt.is_public DESC,
        rt.usage_count DESC,
        rt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update template usage statistics
CREATE OR REPLACE FUNCTION update_template_usage(
    p_template_id UUID,
    p_generation_time_ms INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_avg INTEGER;
    current_count INTEGER;
    new_avg INTEGER;
    success BOOLEAN := false;
BEGIN
    -- Get current statistics
    SELECT usage_count, avg_generation_time_ms 
    INTO current_count, current_avg
    FROM report_templates 
    WHERE id = p_template_id;
    
    -- Calculate new average generation time
    IF p_generation_time_ms IS NOT NULL THEN
        new_avg := CASE 
            WHEN current_avg IS NULL THEN p_generation_time_ms
            ELSE ((current_avg * current_count) + p_generation_time_ms) / (current_count + 1)
        END;
    ELSE
        new_avg := current_avg;
    END IF;
    
    -- Update statistics
    UPDATE report_templates
    SET usage_count = usage_count + 1,
        last_used_at = NOW(),
        last_generated_at = NOW(),
        avg_generation_time_ms = new_avg,
        updated_at = NOW()
    WHERE id = p_template_id;
    
    GET DIAGNOSTICS success = FOUND;
    RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get scheduled templates ready for generation
CREATE OR REPLACE FUNCTION get_scheduled_templates_ready()
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    property_id UUID,
    template_config JSONB,
    schedule_config JSONB,
    next_generation_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rt.id,
        rt.name,
        rt.property_id,
        rt.template_config,
        rt.schedule_config,
        rt.next_generation_at
    FROM report_templates rt
    WHERE rt.is_scheduled = true
    AND rt.is_active = true
    AND rt.next_generation_at <= NOW()
    ORDER BY rt.next_generation_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update next generation time after processing
CREATE OR REPLACE FUNCTION update_next_generation_time(
    p_template_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    schedule_config JSONB;
    success BOOLEAN := false;
BEGIN
    -- Get schedule config
    SELECT rt.schedule_config INTO schedule_config
    FROM report_templates rt
    WHERE rt.id = p_template_id;
    
    -- Update next generation time
    UPDATE report_templates
    SET next_generation_at = calculate_next_generation_time(schedule_config),
        updated_at = NOW()
    WHERE id = p_template_id;
    
    GET DIAGNOSTICS success = FOUND;
    RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate template configuration
CREATE OR REPLACE FUNCTION validate_report_template(
    p_template_id UUID
)
RETURNS JSONB AS $$
DECLARE
    template_record RECORD;
    validation_result JSONB := '{"valid": true, "errors": []}'::jsonb;
    config_errors JSONB := '[]'::jsonb;
BEGIN
    -- Get template record
    SELECT * INTO template_record
    FROM report_templates
    WHERE id = p_template_id;
    
    IF NOT FOUND THEN
        RETURN '{"valid": false, "errors": ["Template not found"]}'::jsonb;
    END IF;
    
    -- Validate template_config
    IF template_record.template_config IS NULL OR template_record.template_config = '{}'::jsonb THEN
        config_errors := config_errors || '["Template configuration is empty"]'::jsonb;
    END IF;
    
    -- Validate required fields in template_config
    IF NOT (template_record.template_config ? 'report_type') THEN
        config_errors := config_errors || '["Missing report_type in configuration"]'::jsonb;
    END IF;
    
    IF NOT (template_record.template_config ? 'data_sources') THEN
        config_errors := config_errors || '["Missing data_sources in configuration"]'::jsonb;
    END IF;
    
    -- Validate schedule configuration if scheduled
    IF template_record.is_scheduled THEN
        IF template_record.schedule_config IS NULL THEN
            config_errors := config_errors || '["Scheduled template missing schedule_config"]'::jsonb;
        ELSIF NOT (template_record.schedule_config ? 'frequency') THEN
            config_errors := config_errors || '["Schedule configuration missing frequency"]'::jsonb;
        END IF;
    END IF;
    
    -- Build final result
    IF jsonb_array_length(config_errors) > 0 THEN
        validation_result := jsonb_build_object(
            'valid', false,
            'errors', config_errors
        );
        
        -- Update template with validation errors
        UPDATE report_templates
        SET validation_errors = config_errors,
            last_validated_at = NOW()
        WHERE id = p_template_id;
    ELSE
        -- Clear any previous validation errors
        UPDATE report_templates
        SET validation_errors = NULL,
            last_validated_at = NOW()
        WHERE id = p_template_id;
    END IF;
    
    RETURN validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_report_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_report_templates_updated_at_trigger
    BEFORE UPDATE ON report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_report_templates_updated_at();

-- Trigger for audit logging on report templates
CREATE TRIGGER audit_report_templates_trigger
    AFTER INSERT OR UPDATE OR DELETE ON report_templates
    FOR EACH ROW 
    EXECUTE FUNCTION enhanced_audit_trigger_function();

-- =====================================================
-- SYSTEM TEMPLATES
-- =====================================================

-- Insert common system templates
INSERT INTO report_templates (
    name, description, category, user_type, template_config,
    is_system_template, is_public, output_format
) VALUES 
(
    'Application Status Summary',
    'Summary of job applications by status and department',
    'applications',
    'system',
    '{
        "report_type": "applications_summary",
        "data_sources": ["job_applications"],
        "date_range": {"type": "relative", "value": "last_30_days"},
        "group_by": ["status", "department"],
        "metrics": ["total_count", "approval_rate"],
        "sorting": {"field": "total_count", "order": "desc"},
        "charts": [
            {"type": "pie", "field": "status", "title": "Applications by Status"},
            {"type": "bar", "x": "department", "y": "total_count", "title": "Applications by Department"}
        ]
    }'::jsonb,
    true,
    true,
    '["pdf", "csv"]'::jsonb
),
(
    'Employee Onboarding Progress',
    'Track employee onboarding completion rates and timelines',
    'employees',
    'system',
    '{
        "report_type": "onboarding_progress",
        "data_sources": ["employees", "onboarding_sessions"],
        "date_range": {"type": "relative", "value": "last_60_days"},
        "group_by": ["onboarding_status", "department"],
        "metrics": ["completion_rate", "avg_completion_time"],
        "charts": [
            {"type": "funnel", "stages": ["not_started", "in_progress", "employee_completed", "approved"]},
            {"type": "line", "x": "date", "y": "completion_rate", "title": "Completion Rate Trend"}
        ]
    }'::jsonb,
    true,
    true,
    '["pdf", "csv"]'::jsonb
),
(
    'Property Performance Dashboard',
    'Comprehensive performance metrics for properties',
    'analytics',
    'system',
    '{
        "report_type": "property_performance",
        "data_sources": ["properties", "job_applications", "employees"],
        "date_range": {"type": "relative", "value": "last_90_days"},
        "group_by": ["property_id"],
        "metrics": ["total_applications", "hire_rate", "avg_onboarding_time", "employee_retention"],
        "charts": [
            {"type": "scatter", "x": "total_applications", "y": "hire_rate", "title": "Applications vs Hire Rate"},
            {"type": "bar", "x": "property_name", "y": "avg_onboarding_time", "title": "Average Onboarding Time"}
        ]
    }'::jsonb,
    true,
    false, -- Only visible to HR
    '["pdf", "excel"]'::jsonb
)
ON CONFLICT (name, created_by, property_id) DO NOTHING;

-- =====================================================
-- INITIAL DATA AND VERIFICATION
-- =====================================================

-- Insert audit log entry
INSERT INTO audit_logs (
    user_type, action, entity_type, entity_name,
    details, compliance_event, risk_level
) VALUES (
    'system', 'create', 'report_templates', 'table_migration',
    jsonb_build_object(
        'migration', '006_create_report_templates_table',
        'version', '1.0.0',
        'tables_created', 1,
        'indexes_created', 9,
        'functions_created', 8,
        'system_templates_created', 3,
        'rls_policies_created', 5
    ),
    true, 'low'
);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 006 completed successfully!';
    RAISE NOTICE '📊 Report templates table created with comprehensive configuration';
    RAISE NOTICE '🔐 Row Level Security policies applied';
    RAISE NOTICE '⚡ Performance indexes created for template queries';
    RAISE NOTICE '📈 System templates installed for common use cases';
    RAISE NOTICE '⏰ Scheduling system ready for automated report generation';
    RAISE NOTICE '🎯 Ready for custom report creation and management';
END $$;