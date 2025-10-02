-- Fix I-9 Forms Table Schema for Production
-- This adds the missing columns that the application expects

-- Add missing columns to i9_forms table
ALTER TABLE i9_forms 
ADD COLUMN IF NOT EXISTS form_data JSONB,
ADD COLUMN IF NOT EXISTS signature_data JSONB,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'i9_forms' 
ORDER BY ordinal_position;