-- =====================================================
-- Migration 005: Create Analytics Events Table
-- HR Manager System Consolidation - Task 2.4
-- =====================================================

-- Description: Create analytics_events table for tracking user interactions
-- Created: 2025-08-06
-- Version: 1.0.0

-- =====================================================
-- CREATE ANALYTICS_EVENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_events (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User context
    user_id UUID,
    user_type VARCHAR(20) CHECK (user_type IN ('hr', 'manager', 'employee', 'anonymous')),
    session_id VARCHAR(255),
    
    -- Event details
    event_type VARCHAR(100) NOT NULL CHECK (event_type IN (
        -- Navigation events
        'page_view', 'dashboard_view', 'tab_change', 'navigation_click',
        -- User actions
        'button_click', 'form_submit', 'search_query', 'filter_apply',
        'bulk_action', 'export_data', 'import_data',
        -- Application workflow
        'application_view', 'application_approve', 'application_reject',
        'application_create', 'application_update',
        -- Employee management
        'employee_view', 'employee_create', 'employee_update',
        'onboarding_start', 'onboarding_complete',
        -- Reporting and analytics
        'report_generate', 'report_view', 'chart_interaction',
        -- System events
        'login', 'logout', 'error_occurred', 'performance_metric'
    )),
    event_category VARCHAR(50) NOT NULL CHECK (event_category IN (
        'navigation', 'user_action', 'workflow', 'reporting', 
        'system', 'performance', 'error', 'security'
    )),
    event_label VARCHAR(255), -- Descriptive label for the event
    
    -- Event data and context
    event_data JSONB DEFAULT '{}'::jsonb,
    page_url TEXT,
    referrer_url TEXT,
    
    -- Property and entity scoping
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    entity_type VARCHAR(50), -- Related entity (application, employee, etc.)
    entity_id UUID, -- Related entity ID
    
    -- Performance and timing
    timing_value INTEGER, -- Milliseconds for performance events
    performance_metrics JSONB, -- Detailed performance data
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(20) DEFAULT 'unknown' CHECK (device_type IN (
        'desktop', 'tablet', 'mobile', 'unknown'
    )),
    browser_name VARCHAR(50),
    browser_version VARCHAR(20),
    os_name VARCHAR(50),
    
    -- Geographic data (if available)
    country_code VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    
    -- A/B testing and experiments
    experiment_id VARCHAR(100),
    experiment_variant VARCHAR(50),
    
    -- Custom dimensions (for extensibility)
    custom_dimension_1 VARCHAR(255),
    custom_dimension_2 VARCHAR(255),
    custom_dimension_3 VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Data quality and processing
    processed_at TIMESTAMP WITH TIME ZONE,
    is_valid BOOLEAN DEFAULT true,
    validation_errors JSONB,
    
    -- Constraints
    CONSTRAINT valid_timing CHECK (timing_value IS NULL OR timing_value >= 0),
    CONSTRAINT valid_event_timestamp CHECK (event_timestamp >= created_at - INTERVAL '1 hour')
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Time-series queries (most common for analytics)
CREATE INDEX IF NOT EXISTS idx_analytics_events_time ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_time ON analytics_events(event_timestamp DESC);

-- User-based analytics
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id, created_at) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_type ON analytics_events(user_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id, created_at) WHERE session_id IS NOT NULL;

-- Property-scoped analytics (for managers)
CREATE INDEX IF NOT EXISTS idx_analytics_events_property ON analytics_events(property_id, created_at) WHERE property_id IS NOT NULL;

-- Event classification
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(event_category, created_at);

-- Entity tracking
CREATE INDEX IF NOT EXISTS idx_analytics_events_entity ON analytics_events(entity_type, entity_id) WHERE entity_id IS NOT NULL;

-- Performance analysis
CREATE INDEX IF NOT EXISTS idx_analytics_events_performance ON analytics_events(event_type, timing_value) WHERE timing_value IS NOT NULL;

-- Device and platform analytics
CREATE INDEX IF NOT EXISTS idx_analytics_events_device ON analytics_events(device_type, browser_name, created_at);

-- Geographic analytics
CREATE INDEX IF NOT EXISTS idx_analytics_events_geo ON analytics_events(country_code, region, created_at) WHERE country_code IS NOT NULL;

-- A/B testing queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_experiments ON analytics_events(experiment_id, experiment_variant, created_at) WHERE experiment_id IS NOT NULL;

-- Composite indexes for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_dashboard ON analytics_events(property_id, event_category, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_funnel ON analytics_events(user_id, event_type, created_at) WHERE user_id IS NOT NULL;

-- Full-text search on event labels and URLs
CREATE INDEX IF NOT EXISTS idx_analytics_events_search ON analytics_events USING GIN(to_tsvector('english', 
    COALESCE(event_label, '') || ' ' || COALESCE(page_url, '')
));

-- Partial index for errors and performance issues
CREATE INDEX IF NOT EXISTS idx_analytics_events_errors ON analytics_events(event_category, event_type, created_at) 
    WHERE event_category IN ('error', 'performance') OR is_valid = false;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- HR can see all analytics events
CREATE POLICY "analytics_events_hr_full_access" ON analytics_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'hr'
        )
    );

-- Managers can see analytics events for their properties
CREATE POLICY "analytics_events_manager_property_access" ON analytics_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM property_managers pm
            JOIN users u ON u.id = pm.manager_id
            WHERE u.id::text = auth.uid()::text 
            AND pm.property_id = analytics_events.property_id
        )
    );

-- Users can see their own analytics events (limited scope)
CREATE POLICY "analytics_events_user_own" ON analytics_events
    FOR SELECT USING (user_id::text = auth.uid()::text);

-- System and services can insert analytics events
CREATE POLICY "analytics_events_system_insert" ON analytics_events
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'user_type' = 'system' OR
        auth.role() = 'service_role' OR
        auth.role() = 'anon' -- Allow anonymous events for tracking
    );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to track analytics event
CREATE OR REPLACE FUNCTION track_analytics_event(
    p_user_id UUID DEFAULT NULL,
    p_user_type VARCHAR DEFAULT 'anonymous',
    p_session_id VARCHAR DEFAULT NULL,
    p_event_type VARCHAR,
    p_event_category VARCHAR,
    p_event_label VARCHAR DEFAULT NULL,
    p_event_data JSONB DEFAULT '{}'::jsonb,
    p_page_url TEXT DEFAULT NULL,
    p_referrer_url TEXT DEFAULT NULL,
    p_property_id UUID DEFAULT NULL,
    p_entity_type VARCHAR DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_timing_value INTEGER DEFAULT NULL,
    p_performance_metrics JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_experiment_id VARCHAR DEFAULT NULL,
    p_experiment_variant VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
    parsed_user_agent JSONB;
BEGIN
    -- Parse user agent if provided
    parsed_user_agent := CASE 
        WHEN p_user_agent IS NOT NULL THEN
            jsonb_build_object(
                'device_type', CASE 
                    WHEN p_user_agent ~* 'Mobile|Android|iPhone|iPad' THEN 'mobile'
                    WHEN p_user_agent ~* 'Tablet|iPad' THEN 'tablet'
                    ELSE 'desktop'
                END,
                'browser_name', CASE
                    WHEN p_user_agent ~* 'Chrome' THEN 'Chrome'
                    WHEN p_user_agent ~* 'Firefox' THEN 'Firefox'
                    WHEN p_user_agent ~* 'Safari' THEN 'Safari'
                    WHEN p_user_agent ~* 'Edge' THEN 'Edge'
                    ELSE 'Unknown'
                END
            )
        ELSE '{}'::jsonb
    END;
    
    INSERT INTO analytics_events (
        user_id, user_type, session_id, event_type, event_category,
        event_label, event_data, page_url, referrer_url, property_id,
        entity_type, entity_id, timing_value, performance_metrics,
        ip_address, user_agent, device_type, browser_name,
        experiment_id, experiment_variant
    ) VALUES (
        p_user_id, p_user_type, p_session_id, p_event_type, p_event_category,
        p_event_label, p_event_data, p_page_url, p_referrer_url, p_property_id,
        p_entity_type, p_entity_id, p_timing_value, p_performance_metrics,
        p_ip_address, p_user_agent, 
        (parsed_user_agent ->> 'device_type')::VARCHAR,
        (parsed_user_agent ->> 'browser_name')::VARCHAR,
        p_experiment_id, p_experiment_variant
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get analytics summary for a date range
CREATE OR REPLACE FUNCTION get_analytics_summary(
    p_property_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_event_category VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    event_type VARCHAR,
    event_count BIGINT,
    unique_users BIGINT,
    unique_sessions BIGINT,
    avg_timing NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.event_type,
        COUNT(*) as event_count,
        COUNT(DISTINCT ae.user_id) as unique_users,
        COUNT(DISTINCT ae.session_id) as unique_sessions,
        AVG(ae.timing_value) as avg_timing
    FROM analytics_events ae
    WHERE ae.created_at BETWEEN p_start_date AND p_end_date
    AND (p_property_id IS NULL OR ae.property_id = p_property_id)
    AND (p_event_category IS NULL OR ae.event_category = p_event_category)
    AND ae.is_valid = true
    GROUP BY ae.event_type
    ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user journey/funnel analysis
CREATE OR REPLACE FUNCTION get_user_journey(
    p_property_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_event_types VARCHAR[] DEFAULT ARRAY['dashboard_view', 'application_view', 'application_approve']
)
RETURNS TABLE (
    step_number INTEGER,
    event_type VARCHAR,
    user_count BIGINT,
    conversion_rate NUMERIC
) AS $$
DECLARE
    total_users BIGINT;
BEGIN
    -- Get total users who started the journey
    SELECT COUNT(DISTINCT user_id) INTO total_users
    FROM analytics_events
    WHERE created_at BETWEEN p_start_date AND p_end_date
    AND (p_property_id IS NULL OR property_id = p_property_id)
    AND event_type = p_event_types[1]
    AND user_id IS NOT NULL;
    
    RETURN QUERY
    WITH RECURSIVE funnel_steps AS (
        SELECT 
            1 as step_number,
            p_event_types[1] as event_type,
            COUNT(DISTINCT user_id) as user_count
        FROM analytics_events
        WHERE created_at BETWEEN p_start_date AND p_end_date
        AND (p_property_id IS NULL OR property_id = p_property_id)
        AND event_type = p_event_types[1]
        AND user_id IS NOT NULL
        
        UNION ALL
        
        SELECT 
            fs.step_number + 1,
            p_event_types[fs.step_number + 1],
            COUNT(DISTINCT ae.user_id)
        FROM funnel_steps fs
        CROSS JOIN analytics_events ae
        WHERE fs.step_number < array_length(p_event_types, 1)
        AND ae.created_at BETWEEN p_start_date AND p_end_date
        AND (p_property_id IS NULL OR ae.property_id = p_property_id)
        AND ae.event_type = p_event_types[fs.step_number + 1]
        AND ae.user_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM analytics_events ae2
            WHERE ae2.user_id = ae.user_id
            AND ae2.event_type = p_event_types[fs.step_number]
            AND ae2.created_at BETWEEN p_start_date AND p_end_date
            AND ae2.created_at <= ae.created_at
        )
        GROUP BY fs.step_number
    )
    SELECT 
        fs.step_number,
        fs.event_type,
        fs.user_count,
        CASE 
            WHEN total_users > 0 THEN ROUND((fs.user_count::NUMERIC / total_users) * 100, 2)
            ELSE 0
        END as conversion_rate
    FROM funnel_steps fs
    ORDER BY fs.step_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get performance metrics summary
CREATE OR REPLACE FUNCTION get_performance_metrics(
    p_property_id UUID DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    metric_name VARCHAR,
    avg_value NUMERIC,
    min_value INTEGER,
    max_value INTEGER,
    p95_value NUMERIC,
    sample_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ae.event_type as metric_name,
        AVG(ae.timing_value) as avg_value,
        MIN(ae.timing_value) as min_value,
        MAX(ae.timing_value) as max_value,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ae.timing_value) as p95_value,
        COUNT(*) as sample_count
    FROM analytics_events ae
    WHERE ae.created_at BETWEEN p_start_date AND p_end_date
    AND (p_property_id IS NULL OR ae.property_id = p_property_id)
    AND ae.event_category = 'performance'
    AND ae.timing_value IS NOT NULL
    AND ae.is_valid = true
    GROUP BY ae.event_type
    HAVING COUNT(*) > 5 -- Only include metrics with sufficient samples
    ORDER BY avg_value DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old analytics events
CREATE OR REPLACE FUNCTION cleanup_old_analytics_events(
    p_retention_days INTEGER DEFAULT 365
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Archive or delete events older than retention period
    DELETE FROM analytics_events 
    WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup action
    PERFORM track_analytics_event(
        NULL, 'system', NULL,
        'cleanup', 'system', 'analytics_events_cleanup',
        jsonb_build_object(
            'deleted_count', deleted_count,
            'retention_days', p_retention_days,
            'cleanup_date', NOW()
        )
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger for automatic user agent parsing and validation
CREATE OR REPLACE FUNCTION process_analytics_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Set processed timestamp
    NEW.processed_at := NOW();
    
    -- Basic validation
    IF NEW.event_type IS NULL OR NEW.event_category IS NULL THEN
        NEW.is_valid := false;
        NEW.validation_errors := jsonb_build_object('error', 'Missing required fields');
    END IF;
    
    -- Set event timestamp if not provided
    IF NEW.event_timestamp IS NULL THEN
        NEW.event_timestamp := NEW.created_at;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER process_analytics_event_trigger
    BEFORE INSERT ON analytics_events
    FOR EACH ROW
    EXECUTE FUNCTION process_analytics_event();

-- =====================================================
-- VIEWS FOR COMMON ANALYTICS QUERIES
-- =====================================================

-- Daily analytics summary view
CREATE OR REPLACE VIEW daily_analytics_summary AS
SELECT 
    DATE(created_at) as analytics_date,
    property_id,
    event_category,
    COUNT(*) as total_events,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT session_id) as unique_sessions,
    AVG(timing_value) as avg_timing
FROM analytics_events
WHERE is_valid = true
AND created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at), property_id, event_category;

-- User engagement metrics view
CREATE OR REPLACE VIEW user_engagement_metrics AS
SELECT 
    user_id,
    user_type,
    property_id,
    DATE(created_at) as activity_date,
    COUNT(*) as total_events,
    COUNT(DISTINCT event_type) as unique_event_types,
    MIN(created_at) as first_event,
    MAX(created_at) as last_event,
    EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))/60 as session_duration_minutes
FROM analytics_events
WHERE user_id IS NOT NULL
AND is_valid = true
AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id, user_type, property_id, DATE(created_at);

-- =====================================================
-- INITIAL DATA AND VERIFICATION
-- =====================================================

-- Track the migration as an analytics event
PERFORM track_analytics_event(
    NULL, 'system', NULL,
    'migration_complete', 'system', 'analytics_events_table_created',
    jsonb_build_object(
        'migration', '005_create_analytics_events_table',
        'version', '1.0.0',
        'tables_created', 1,
        'indexes_created', 14,
        'functions_created', 5,
        'views_created', 2
    )
);

-- Insert audit log entry
INSERT INTO audit_logs (
    user_type, action, entity_type, entity_name,
    details, compliance_event, risk_level
) VALUES (
    'system', 'create', 'analytics_events', 'table_migration',
    jsonb_build_object(
        'migration', '005_create_analytics_events_table',
        'version', '1.0.0',
        'tables_created', 1,
        'indexes_created', 14,
        'functions_created', 5,
        'views_created', 2,
        'rls_policies_created', 4
    ),
    true, 'low'
);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 005 completed successfully!';
    RAISE NOTICE '📊 Analytics events table created for user interaction tracking';
    RAISE NOTICE '🔐 Row Level Security policies applied';
    RAISE NOTICE '⚡ Performance indexes created for time-series queries';
    RAISE NOTICE '📈 Analytics functions and views available';
    RAISE NOTICE '🎯 Ready for comprehensive user behavior analytics';
END $$;