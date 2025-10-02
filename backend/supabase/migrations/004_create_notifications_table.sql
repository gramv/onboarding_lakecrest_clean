-- =====================================================
-- Migration 004: Create Notifications Table
-- HR Manager System Consolidation - Task 2.3
-- =====================================================

-- Description: Create notifications table with multi-channel support
-- Created: 2025-08-06
-- Version: 1.0.0

-- =====================================================
-- CREATE NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Recipient details
    user_id UUID,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('hr', 'manager', 'employee')),
    user_email VARCHAR(255), -- Store email for delivery even if user is deleted
    
    -- Notification content
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'new_application', 'application_approved', 'application_rejected',
        'onboarding_reminder', 'deadline_reminder', 'document_uploaded',
        'system_alert', 'maintenance_notice', 'policy_update',
        'bulk_operation_complete', 'report_ready', 'compliance_alert'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    
    -- Additional data and context
    data JSONB DEFAULT '{}'::jsonb,
    action_url TEXT, -- Deep link for notification actions
    
    -- Multi-channel delivery
    channels JSONB NOT NULL DEFAULT '["in_app"]'::jsonb CHECK (
        channels::jsonb ?| array['in_app', 'email', 'sms', 'webhook']
    ),
    delivery_status JSONB DEFAULT '{}'::jsonb,
    
    -- Scoping and filtering
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    entity_type VARCHAR(50), -- Related entity type for context
    entity_id UUID, -- Related entity ID
    
    -- Priority and urgency
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    urgency VARCHAR(20) DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'sent', 'delivered', 'failed', 'cancelled'
    )),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Delivery tracking
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    
    -- Scheduling and expiration
    scheduled_for TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Batch and campaign tracking
    batch_id UUID, -- For grouping related notifications
    campaign_id VARCHAR(100), -- For marketing/announcement campaigns
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_scheduling CHECK (
        scheduled_for IS NULL OR scheduled_for >= created_at
    ),
    CONSTRAINT valid_expiration CHECK (
        expires_at IS NULL OR expires_at > created_at
    ),
    CONSTRAINT valid_read_timestamp CHECK (
        read_at IS NULL OR (is_read = true AND read_at >= created_at)
    )
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- User-focused queries (primary dashboard use case)
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, user_type, is_read, created_at) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at) WHERE is_read = false AND user_id IS NOT NULL;

-- Property-scoped queries (for managers)
CREATE INDEX IF NOT EXISTS idx_notifications_property_id ON notifications(property_id, created_at) WHERE property_id IS NOT NULL;

-- Type-based filtering
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority, urgency, created_at);

-- Status and delivery tracking
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_delivery ON notifications(status, sent_at, retry_count) WHERE status IN ('pending', 'failed');

-- Scheduling queries
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_expiring ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Batch operations
CREATE INDEX IF NOT EXISTS idx_notifications_batch ON notifications(batch_id) WHERE batch_id IS NOT NULL;

-- Entity relationship queries
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id) WHERE entity_id IS NOT NULL;

-- Full-text search on content
CREATE INDEX IF NOT EXISTS idx_notifications_content_search ON notifications USING GIN(to_tsvector('english', title || ' ' || COALESCE(message, '')));

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_dashboard ON notifications(user_id, property_id, is_read, priority, created_at);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES  
-- =====================================================

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "notifications_user_own" ON notifications
    FOR SELECT USING (user_id::text = auth.uid()::text);

-- Users can mark their own notifications as read
CREATE POLICY "notifications_user_update_own" ON notifications
    FOR UPDATE USING (user_id::text = auth.uid()::text)
    WITH CHECK (user_id::text = auth.uid()::text);

-- HR can see all notifications
CREATE POLICY "notifications_hr_full_access" ON notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'hr'
        )
    );

-- Managers can see notifications for their properties
CREATE POLICY "notifications_manager_property_access" ON notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM property_managers pm
            JOIN users u ON u.id = pm.manager_id
            WHERE u.id::text = auth.uid()::text 
            AND pm.property_id = notifications.property_id
        )
    );

-- System can create and manage all notifications
CREATE POLICY "notifications_system_manage" ON notifications
    FOR ALL USING (
        auth.jwt() ->> 'user_type' = 'system' OR
        auth.role() = 'service_role'
    );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_user_type VARCHAR,
    p_user_email VARCHAR,
    p_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT DEFAULT NULL,
    p_data JSONB DEFAULT '{}'::jsonb,
    p_action_url TEXT DEFAULT NULL,
    p_channels JSONB DEFAULT '["in_app"]'::jsonb,
    p_property_id UUID DEFAULT NULL,
    p_entity_type VARCHAR DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_priority VARCHAR DEFAULT 'normal',
    p_urgency VARCHAR DEFAULT 'normal',
    p_scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_batch_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id, user_type, user_email, type, title, message,
        data, action_url, channels, property_id, entity_type, entity_id,
        priority, urgency, scheduled_for, expires_at, batch_id
    ) VALUES (
        p_user_id, p_user_type, p_user_email, p_type, p_title, p_message,
        p_data, p_action_url, p_channels, p_property_id, p_entity_type, p_entity_id,
        p_priority, p_urgency, p_scheduled_for, p_expires_at, p_batch_id
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    success BOOLEAN := false;
BEGIN
    UPDATE notifications 
    SET is_read = true, 
        read_at = NOW(),
        updated_at = NOW()
    WHERE id = p_notification_id
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND is_read = false;
    
    GET DIAGNOSTICS success = FOUND;
    RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark multiple notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read_batch(
    p_notification_ids UUID[],
    p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE notifications 
    SET is_read = true, 
        read_at = NOW(),
        updated_at = NOW()
    WHERE id = ANY(p_notification_ids)
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND is_read = false;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(
    p_user_id UUID,
    p_property_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM notifications
    WHERE user_id = p_user_id
    AND is_read = false
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (p_property_id IS NULL OR property_id = p_property_id);
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending notifications for delivery
CREATE OR REPLACE FUNCTION get_pending_notifications(
    p_channel VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    user_email VARCHAR,
    type VARCHAR,
    title VARCHAR,
    message TEXT,
    data JSONB,
    channels JSONB,
    priority VARCHAR,
    scheduled_for TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.user_email,
        n.type,
        n.title,
        n.message,
        n.data,
        n.channels,
        n.priority,
        n.scheduled_for
    FROM notifications n
    WHERE n.status = 'pending'
    AND (n.scheduled_for IS NULL OR n.scheduled_for <= NOW())
    AND (n.expires_at IS NULL OR n.expires_at > NOW())
    AND (p_channel IS NULL OR n.channels::jsonb ? p_channel)
    ORDER BY n.priority DESC, n.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update notification delivery status
CREATE OR REPLACE FUNCTION update_notification_delivery_status(
    p_notification_id UUID,
    p_channel VARCHAR,
    p_status VARCHAR,
    p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_delivery_status JSONB;
    success BOOLEAN := false;
BEGIN
    -- Get current delivery status
    SELECT delivery_status INTO current_delivery_status
    FROM notifications
    WHERE id = p_notification_id;
    
    -- Update delivery status for the specific channel
    current_delivery_status := COALESCE(current_delivery_status, '{}'::jsonb);
    current_delivery_status := jsonb_set(
        current_delivery_status,
        ARRAY[p_channel],
        jsonb_build_object(
            'status', p_status,
            'timestamp', NOW(),
            'error', p_error_message
        )
    );
    
    -- Update the notification
    UPDATE notifications
    SET delivery_status = current_delivery_status,
        status = CASE 
            WHEN p_status = 'delivered' THEN 'delivered'
            WHEN p_status = 'failed' THEN 'failed'
            ELSE status
        END,
        sent_at = CASE WHEN p_status IN ('sent', 'delivered') THEN NOW() ELSE sent_at END,
        delivered_at = CASE WHEN p_status = 'delivered' THEN NOW() ELSE delivered_at END,
        failed_at = CASE WHEN p_status = 'failed' THEN NOW() ELSE failed_at END,
        retry_count = CASE WHEN p_status = 'failed' THEN retry_count + 1 ELSE retry_count END,
        updated_at = NOW()
    WHERE id = p_notification_id;
    
    GET DIAGNOSTICS success = FOUND;
    RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications(
    p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete old read notifications
    DELETE FROM notifications 
    WHERE is_read = true
    AND read_at < NOW() - (p_retention_days || ' days')::INTERVAL;
    
    -- Delete expired notifications
    DELETE FROM notifications
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup action in audit logs
    PERFORM create_audit_log(
        NULL, 'system', NULL,
        'delete', 'notifications', NULL,
        'cleanup_operation', NULL,
        jsonb_build_object('deleted_count', deleted_count, 'retention_days', p_retention_days),
        NULL, NULL, NULL, NULL, NULL, NULL,
        true, 'low'
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notifications_updated_at_trigger
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- Trigger for audit logging on notifications
CREATE TRIGGER audit_notifications_trigger
    AFTER INSERT OR UPDATE OR DELETE ON notifications
    FOR EACH ROW 
    EXECUTE FUNCTION enhanced_audit_trigger_function();

-- =====================================================
-- INITIAL DATA AND VERIFICATION
-- =====================================================

-- Create initial system notification types as reference
INSERT INTO notifications (
    user_type, type, title, message,
    data, priority, expires_at
) VALUES (
    'system', 'system_alert', 'Notifications System Initialized',
    'The enhanced notifications system has been successfully deployed and is ready for use.',
    jsonb_build_object(
        'migration', '004_create_notifications_table',
        'version', '1.0.0',
        'features', jsonb_build_array('multi_channel', 'scheduling', 'batching', 'rls_security')
    ),
    'low',
    NOW() + INTERVAL '30 days'
) ON CONFLICT DO NOTHING;

-- Insert audit log entry
INSERT INTO audit_logs (
    user_type, action, entity_type, entity_name,
    details, compliance_event, risk_level
) VALUES (
    'system', 'create', 'notifications', 'table_migration',
    jsonb_build_object(
        'migration', '004_create_notifications_table',
        'version', '1.0.0',
        'tables_created', 1,
        'indexes_created', 12,
        'functions_created', 7,
        'triggers_created', 2,
        'rls_policies_created', 5
    ),
    true, 'low'
);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 004 completed successfully!';
    RAISE NOTICE '📨 Notifications table created with multi-channel support';
    RAISE NOTICE '🔐 Row Level Security policies applied';
    RAISE NOTICE '⚡ Performance indexes created for dashboard queries';
    RAISE NOTICE '📬 Delivery status tracking and scheduling enabled';
    RAISE NOTICE '🔔 Ready for real-time notifications across all channels';
END $$;