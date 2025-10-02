-- Fix property_managers table schema
-- Run this in Supabase SQL Editor

-- First, check if the table exists
-- If it doesn't exist or has wrong column names, recreate it

-- Drop the table if it exists with wrong schema
DROP TABLE IF EXISTS property_managers CASCADE;

-- Create the property_managers junction table with correct column names
CREATE TABLE property_managers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(manager_id, property_id)
);

-- Create indexes for better performance
CREATE INDEX idx_property_managers_manager_id ON property_managers(manager_id);
CREATE INDEX idx_property_managers_property_id ON property_managers(property_id);

-- Enable Row Level Security
ALTER TABLE property_managers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- HR can manage all property-manager assignments
CREATE POLICY "HR can manage all property_managers" ON property_managers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'hr'
        )
    );

-- Managers can view their own assignments
CREATE POLICY "Managers can view their assignments" ON property_managers
    FOR SELECT
    USING (
        manager_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'manager'
        )
    );

-- Grant permissions
GRANT ALL ON property_managers TO authenticated;
GRANT ALL ON property_managers TO anon;

-- Test the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'property_managers'
ORDER BY 
    ordinal_position;