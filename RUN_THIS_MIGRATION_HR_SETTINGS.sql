-- =====================================================
-- HR SETTINGS TABLE MIGRATION
-- Copy this entire file and run in Supabase SQL Editor
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CREATE HR_SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS hr_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(50) NOT NULL CHECK (setting_type IN ('training', 'notification', 'system', 'compliance')),
    description TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INSERT DEFAULT SETTINGS
-- =====================================================

-- Insert default training video settings
INSERT INTO hr_settings (setting_key, setting_value, setting_type, description)
VALUES 
(
    'human_trafficking_training_videos',
    '{"video_id_en": "XhbfGo7voB8", "video_id_es": "XhbfGo7voB8"}'::jsonb,
    'training',
    'YouTube video IDs for human trafficking awareness training by language'
)
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_hr_settings_type ON hr_settings(setting_type);
CREATE INDEX IF NOT EXISTS idx_hr_settings_key ON hr_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_hr_settings_updated_at ON hr_settings(updated_at);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE hr_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE RLS POLICIES
-- =====================================================

-- Allow everyone to read settings (public endpoint needs this)
DROP POLICY IF EXISTS "hr_settings_select_policy" ON hr_settings;
CREATE POLICY "hr_settings_select_policy" ON hr_settings
    FOR SELECT USING (true);

-- Only HR users can update settings
DROP POLICY IF EXISTS "hr_settings_update_policy" ON hr_settings;
CREATE POLICY "hr_settings_update_policy" ON hr_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'hr'
        )
    );

-- Only HR users can insert new settings
DROP POLICY IF EXISTS "hr_settings_insert_policy" ON hr_settings;
CREATE POLICY "hr_settings_insert_policy" ON hr_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'hr'
        )
    );

-- Only HR users can delete settings
DROP POLICY IF EXISTS "hr_settings_delete_policy" ON hr_settings;
CREATE POLICY "hr_settings_delete_policy" ON hr_settings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'hr'
        )
    );

-- =====================================================
-- CREATE AUDIT TRIGGER
-- =====================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_hr_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_hr_settings_updated_at ON hr_settings;
CREATE TRIGGER trigger_update_hr_settings_updated_at
    BEFORE UPDATE ON hr_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_hr_settings_updated_at();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE hr_settings IS 'System-wide settings configurable by HR users';
COMMENT ON COLUMN hr_settings.setting_key IS 'Unique identifier for the setting';
COMMENT ON COLUMN hr_settings.setting_value IS 'JSON object containing the setting value(s)';
COMMENT ON COLUMN hr_settings.setting_type IS 'Category of the setting for organization';

