-- Migration: Add completed_at column to i9_forms table
-- Date: 2025-08-23
-- Purpose: Fix production error "Could not find the 'completed_at' column of 'i9_forms'"

-- Add completed_at column to i9_forms table
ALTER TABLE i9_forms 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Update existing records to have a completed_at value if they don't have one
-- Use updated_at as a fallback for existing records
UPDATE i9_forms 
SET completed_at = updated_at 
WHERE completed_at IS NULL AND updated_at IS NOT NULL;

-- Add index for performance when querying by completed status
CREATE INDEX IF NOT EXISTS idx_i9_completed ON i9_forms(completed_at);