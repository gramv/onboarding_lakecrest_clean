-- Migration: Create user_preferences table for personalization settings
-- Date: 2025-08-07
-- Description: Stores user-specific preferences for dashboard customization and notifications

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Dashboard preferences
    dashboard_layout TEXT DEFAULT 'default', -- 'default', 'compact', 'expanded'
    theme TEXT DEFAULT 'light', -- 'light', 'dark', 'auto'
    language TEXT DEFAULT 'en', -- 'en', 'es'
    timezone TEXT DEFAULT 'America/New_York',
    date_format TEXT DEFAULT 'MM/DD/YYYY',
    items_per_page INTEGER DEFAULT 20,
    
    -- Notification preferences
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT false,
    in_app_notifications BOOLEAN DEFAULT true,
    
    -- Notification types to receive
    notification_types JSONB DEFAULT '{"application_submitted": true, "application_approved": true, "deadline_reminder": true, "system_updates": false}'::jsonb,
    
    -- Email frequency
    email_frequency TEXT DEFAULT 'immediate', -- 'immediate', 'daily', 'weekly', 'never'
    daily_digest_time TIME DEFAULT '09:00:00',
    
    -- Dashboard widgets configuration
    dashboard_widgets JSONB DEFAULT '{"stats": true, "recent_applications": true, "pending_tasks": true, "notifications": true, "analytics": true}'::jsonb,
    widget_order TEXT[] DEFAULT ARRAY['stats', 'pending_tasks', 'recent_applications', 'notifications', 'analytics'],
    
    -- Saved filters and searches
    saved_filters JSONB DEFAULT '[]'::jsonb,
    saved_searches JSONB DEFAULT '[]'::jsonb,
    recent_searches TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Quick actions
    quick_actions JSONB DEFAULT '[]'::jsonb,
    pinned_properties UUID[] DEFAULT ARRAY[]::UUID[],
    
    -- Accessibility settings
    high_contrast BOOLEAN DEFAULT false,
    font_size TEXT DEFAULT 'medium', -- 'small', 'medium', 'large', 'extra-large'
    reduce_motion BOOLEAN DEFAULT false,
    screen_reader_mode BOOLEAN DEFAULT false,
    
    -- Advanced preferences
    auto_refresh_interval INTEGER DEFAULT 30, -- seconds, 0 = disabled
    show_tooltips BOOLEAN DEFAULT true,
    enable_shortcuts BOOLEAN DEFAULT true,
    sound_notifications BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_modified_by UUID REFERENCES users(id),
    
    CONSTRAINT unique_user_preferences UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_theme ON user_preferences(theme);
CREATE INDEX idx_user_preferences_language ON user_preferences(language);

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_preferences_updated_at_trigger
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- Row Level Security (RLS)
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view and update their own preferences
CREATE POLICY user_preferences_own_access ON user_preferences
    FOR ALL
    USING (auth.uid()::uuid = user_id)
    WITH CHECK (auth.uid()::uuid = user_id);

-- Policy: HR users can view all preferences (for support)
CREATE POLICY user_preferences_hr_read ON user_preferences
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()::uuid
            AND role = 'hr'
        )
    );

-- Insert default preferences for existing users
INSERT INTO user_preferences (user_id)
SELECT id FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM user_preferences WHERE user_preferences.user_id = users.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE user_preferences IS 'Stores user-specific preferences for dashboard customization, notifications, and accessibility settings';
COMMENT ON COLUMN user_preferences.dashboard_widgets IS 'JSON configuration for which dashboard widgets to display';
COMMENT ON COLUMN user_preferences.saved_filters IS 'Array of saved filter configurations for quick access';
COMMENT ON COLUMN user_preferences.notification_types IS 'JSON object defining which types of notifications the user wants to receive';