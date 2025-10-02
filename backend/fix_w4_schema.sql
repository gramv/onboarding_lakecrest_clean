-- Fix W-4 Forms Database Schema
-- ===============================
-- This SQL script fixes the w4_forms table schema to match what the backend expects.

-- Step 1: Add missing columns to w4_forms table
ALTER TABLE w4_forms 
ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}';

ALTER TABLE w4_forms 
ADD COLUMN IF NOT EXISTS signed BOOLEAN DEFAULT false;

ALTER TABLE w4_forms 
ADD COLUMN IF NOT EXISTS signature_data JSONB;

ALTER TABLE w4_forms 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE w4_forms 
ADD COLUMN IF NOT EXISTS tax_year INTEGER DEFAULT 2025;

-- Step 2: Migrate existing data from 'data' column to 'form_data' column
UPDATE w4_forms 
SET form_data = COALESCE(data, '{}')
WHERE form_data = '{}' AND data IS NOT NULL;

-- Step 3: Set tax_year for existing records
UPDATE w4_forms 
SET tax_year = 2025 
WHERE tax_year IS NULL;

-- Step 4: Make tax_year NOT NULL after setting default values
ALTER TABLE w4_forms 
ALTER COLUMN tax_year SET NOT NULL;

-- Step 5: Create index for performance
CREATE INDEX IF NOT EXISTS idx_w4_forms_employee_year ON w4_forms(employee_id, tax_year);

-- Verification: Check the final schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'w4_forms' 
ORDER BY ordinal_position;
