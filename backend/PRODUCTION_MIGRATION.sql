-- ========================================================
-- PRODUCTION MIGRATION: Email Notification System
-- Run this in Supabase SQL Editor
-- Date: 2025-09-03
-- ========================================================

-- Step 1: Create property_email_recipients table
CREATE TABLE IF NOT EXISTS property_email_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    receives_applications BOOLEAN DEFAULT true,
    added_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_property_email UNIQUE(property_id, email)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_email_recipients_property 
ON property_email_recipients(property_id);

CREATE INDEX IF NOT EXISTS idx_property_email_recipients_active 
ON property_email_recipients(is_active) 
WHERE is_active = true;

-- Step 3: Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_property_email_recipients_updated_at
    BEFORE UPDATE ON property_email_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Add email preferences to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS receive_application_emails BOOLEAN DEFAULT true;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_preferences JSONB DEFAULT '{"applications": true, "approvals": true, "reminders": true}'::jsonb;

-- Step 5: Create notification recipients view
CREATE OR REPLACE VIEW property_notification_recipients AS
SELECT 
    p.id as property_id,
    p.name as property_name,
    COALESCE(
        jsonb_agg(
            DISTINCT jsonb_build_object(
                'email', COALESCE(per.email, u.email),
                'name', COALESCE(per.name, u.first_name || ' ' || u.last_name),
                'type', CASE 
                    WHEN per.email IS NOT NULL THEN 'recipient'
                    ELSE 'manager'
                END,
                'receives_applications', CASE 
                    WHEN per.email IS NOT NULL THEN per.receives_applications
                    ELSE (u.email_preferences->>'applications')::boolean
                END
            )
        ) FILTER (
            WHERE (per.email IS NOT NULL AND per.is_active = true) 
               OR (u.email IS NOT NULL AND u.role = 'manager' AND (u.email_preferences->>'applications')::boolean = true)
        ),
        '[]'::jsonb
    ) as recipients
FROM properties p
LEFT JOIN property_email_recipients per ON p.id = per.property_id AND per.is_active = true
LEFT JOIN property_managers pm ON p.id = pm.property_id
LEFT JOIN users u ON pm.manager_id = u.id AND u.role = 'manager'
GROUP BY p.id, p.name;

-- Step 6: Add documentation
COMMENT ON TABLE property_email_recipients 
IS 'Stores additional email recipients for job application notifications per property';

COMMENT ON COLUMN property_email_recipients.receives_applications 
IS 'Whether this recipient should receive new job application notifications';

COMMENT ON COLUMN users.receive_application_emails 
IS 'Manager preference for receiving job application notification emails';

COMMENT ON COLUMN users.email_preferences 
IS 'JSON object storing detailed email preferences for different notification types';

-- ========================================================
-- VERIFICATION QUERIES (Run after migration)
-- ========================================================

-- Check table was created:
-- SELECT * FROM property_email_recipients LIMIT 1;

-- Check columns were added to users:
-- SELECT email_preferences, receive_application_emails FROM users LIMIT 1;

-- Check view works:
-- SELECT * FROM property_notification_recipients LIMIT 1;

-- ========================================================
-- ROLLBACK SCRIPT (Only if needed)
-- ========================================================
-- DROP TABLE IF EXISTS property_email_recipients CASCADE;
-- ALTER TABLE users DROP COLUMN IF EXISTS email_preferences;
-- ALTER TABLE users DROP COLUMN IF EXISTS receive_application_emails;
-- DROP VIEW IF EXISTS property_notification_recipients;