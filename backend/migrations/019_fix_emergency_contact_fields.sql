-- Migration: Fix Emergency Contact Fields
-- Created: 2025-10-11
-- Purpose: Remove emergency_contact_email and add emergency_contact_address instead

-- Remove the email column (we don't collect this)
ALTER TABLE employees DROP COLUMN IF EXISTS emergency_contact_email;

-- Add address column (we DO collect this)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_address TEXT;

-- Add comment to document the column
COMMENT ON COLUMN employees.emergency_contact_address IS 'Emergency contact full address (street, city, state, zip)';

-- Verify columns are correct
DO $$
BEGIN
    RAISE NOTICE 'Emergency contact columns updated successfully';
    RAISE NOTICE 'Columns now: name, relationship, phone, address';
END $$;

