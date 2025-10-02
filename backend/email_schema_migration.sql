
-- Create property_email_recipients table if it doesn't exist
CREATE TABLE IF NOT EXISTS property_email_recipients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'notification',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(property_id, email)
);

-- Add missing columns to users table if they don't exist
DO $$ 
BEGIN
    -- Add email_preferences column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'email_preferences'
    ) THEN
        ALTER TABLE users ADD COLUMN email_preferences JSONB DEFAULT '{
            "application_submitted": true,
            "onboarding_completed": true,
            "document_uploaded": true,
            "i9_verification_needed": true,
            "daily_summary": false
        }'::jsonb;
    END IF;

    -- Add receive_application_emails column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'receive_application_emails'
    ) THEN
        ALTER TABLE users ADD COLUMN receive_application_emails BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_email_recipients_property_id ON property_email_recipients(property_id);
CREATE INDEX IF NOT EXISTS idx_property_email_recipients_email ON property_email_recipients(email);
CREATE INDEX IF NOT EXISTS idx_property_email_recipients_is_active ON property_email_recipients(is_active);

-- Enable Row Level Security
ALTER TABLE property_email_recipients ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for property_email_recipients
DROP POLICY IF EXISTS "property_email_recipients_select_policy" ON property_email_recipients;
CREATE POLICY "property_email_recipients_select_policy" ON property_email_recipients
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "property_email_recipients_insert_policy" ON property_email_recipients;
CREATE POLICY "property_email_recipients_insert_policy" ON property_email_recipients
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "property_email_recipients_update_policy" ON property_email_recipients;
CREATE POLICY "property_email_recipients_update_policy" ON property_email_recipients
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "property_email_recipients_delete_policy" ON property_email_recipients;
CREATE POLICY "property_email_recipients_delete_policy" ON property_email_recipients
    FOR DELETE USING (true);
