-- Migration: Extract Emergency Contacts from JSONB to dedicated columns
-- Created: 2025-10-11
-- Purpose: Move emergency contact information from personal_info JSONB to dedicated columns for better querying

-- Add emergency contact columns to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_address TEXT;

-- Add index for emergency contact name for faster searches
CREATE INDEX IF NOT EXISTS idx_employees_emergency_contact_name ON employees(emergency_contact_name);

-- Add comments to document the columns
COMMENT ON COLUMN employees.emergency_contact_name IS 'Primary emergency contact full name';
COMMENT ON COLUMN employees.emergency_contact_relationship IS 'Relationship to employee (e.g., spouse, parent, sibling)';
COMMENT ON COLUMN employees.emergency_contact_phone IS 'Emergency contact phone number';
COMMENT ON COLUMN employees.emergency_contact_address IS 'Emergency contact full address';

-- Note: Data migration happens automatically in the complete-review endpoint
-- The personal_info JSONB field is preserved for backward compatibility

