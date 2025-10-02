-- =====================================================
-- Migration 007: Create Saved Filters Table
-- HR Manager System Consolidation - Task 2
-- =====================================================

-- Description: Create saved filters table for dashboards and lists
-- Created: 2025-08-06
-- Version: 1.0.0

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CREATE SAVED_FILTERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS saved_filters (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Filter metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    filter_type VARCHAR(50) NOT NULL CHECK (filter_type IN (
        'employee', 'application', 'property', 'onboarding', 
        'audit_log', 'notification', 'report', 'analytics'
    )),
    
    -- Filter configuration
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- User context
    user_id UUID NOT NULL,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Sharing and defaults
    is_default BOOLEAN DEFAULT false,
    is_shared BOOLEAN DEFAULT false,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- User queries
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_id ON saved_filters(user_id);

-- Filter type queries
CREATE INDEX IF NOT EXISTS idx_saved_filters_filter_type ON saved_filters(filter_type);

-- Property-scoped queries
CREATE INDEX IF NOT EXISTS idx_saved_filters_property_id ON saved_filters(property_id) WHERE property_id IS NOT NULL;

-- Shared filters
CREATE INDEX IF NOT EXISTS idx_saved_filters_shared ON saved_filters(is_shared) WHERE is_shared = true;

-- Default filters
CREATE INDEX IF NOT EXISTS idx_saved_filters_default ON saved_filters(user_id, filter_type, is_default) WHERE is_default = true;

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_type ON saved_filters(user_id, filter_type);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;

-- Users can manage their own filters
CREATE POLICY "saved_filters_user_own" ON saved_filters
    FOR ALL USING (
        user_id::text = auth.uid()::text
    );

-- Users can view shared filters
CREATE POLICY "saved_filters_shared_read" ON saved_filters
    FOR SELECT USING (
        is_shared = true
    );

-- Managers can only see filters for their property or shared filters
CREATE POLICY "saved_filters_manager_property" ON saved_filters
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM property_managers pm
            JOIN users u ON u.id = pm.manager_id
            WHERE u.id::text = auth.uid()::text 
            AND (pm.property_id = saved_filters.property_id OR saved_filters.is_shared = true)
        )
    );

-- HR can see all filters
CREATE POLICY "saved_filters_hr_full_access" ON saved_filters
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'hr'
        )
    );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to create or update a saved filter
CREATE OR REPLACE FUNCTION upsert_saved_filter(
    p_name VARCHAR,
    p_filter_type VARCHAR,
    p_filters JSONB,
    p_user_id UUID,
    p_description TEXT DEFAULT NULL,
    p_property_id UUID DEFAULT NULL,
    p_is_default BOOLEAN DEFAULT false,
    p_is_shared BOOLEAN DEFAULT false,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    filter_id UUID;
BEGIN
    -- If setting as default, unset other defaults for this user and filter type
    IF p_is_default THEN
        UPDATE saved_filters 
        SET is_default = false 
        WHERE user_id = p_user_id 
        AND filter_type = p_filter_type 
        AND is_default = true;
    END IF;
    
    -- Insert or update the filter
    INSERT INTO saved_filters (
        name, description, filter_type, filters, user_id,
        property_id, is_default, is_shared, metadata
    ) VALUES (
        p_name, p_description, p_filter_type, p_filters, p_user_id,
        p_property_id, p_is_default, p_is_shared, p_metadata
    )
    ON CONFLICT (user_id, name, filter_type) 
    DO UPDATE SET
        filters = EXCLUDED.filters,
        description = EXCLUDED.description,
        is_default = EXCLUDED.is_default,
        is_shared = EXCLUDED.is_shared,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    RETURNING id INTO filter_id;
    
    RETURN filter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get default filter for a user and type
CREATE OR REPLACE FUNCTION get_default_filter(
    p_user_id UUID,
    p_filter_type VARCHAR
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    filters JSONB,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sf.id,
        sf.name,
        sf.filters,
        sf.metadata
    FROM saved_filters sf
    WHERE sf.user_id = p_user_id
    AND sf.filter_type = p_filter_type
    AND sf.is_default = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_filters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER saved_filters_updated_at_trigger
    BEFORE UPDATE ON saved_filters
    FOR EACH ROW
    EXECUTE FUNCTION update_saved_filters_updated_at();

-- =====================================================
-- ADD UNIQUE CONSTRAINT
-- =====================================================

-- Ensure filter names are unique per user and filter type
ALTER TABLE saved_filters 
ADD CONSTRAINT unique_filter_name_per_user_type 
UNIQUE (user_id, name, filter_type);

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert system notification about migration
INSERT INTO audit_logs (
    user_type, action, entity_type, entity_name,
    details, compliance_event, risk_level
) VALUES (
    'system', 'create', 'saved_filters', 'table_migration',
    jsonb_build_object(
        'migration', '007_create_saved_filters_table',
        'version', '1.0.0',
        'tables_created', 1,
        'indexes_created', 6,
        'functions_created', 2,
        'triggers_created', 1
    ),
    true, 'low'
) ON CONFLICT DO NOTHING;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 007 completed successfully!';
    RAISE NOTICE '💾 Saved filters table created';
    RAISE NOTICE '🔐 Row Level Security policies applied';
    RAISE NOTICE '⚡ Performance indexes created';
    RAISE NOTICE '🔧 Helper functions installed';
    RAISE NOTICE '📝 Ready for saving user dashboard filters';
END $$;