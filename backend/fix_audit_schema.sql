-- Fix Audit Logs Schema
-- ======================
-- Add missing endpoint column to audit_logs table

-- Add the missing endpoint column
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS endpoint TEXT;

-- Verify the schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
ORDER BY ordinal_position;
