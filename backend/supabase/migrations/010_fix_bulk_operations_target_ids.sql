-- Migration: Fix bulk_operations target_ids column to support flexible ID types
-- Date: 2025-08-07
-- Description: Changes target_ids from UUID[] to JSONB to support both UUID and string IDs

-- First, backup any existing data (if any)
CREATE TEMP TABLE bulk_operations_backup AS 
SELECT * FROM bulk_operations;

-- Drop the old column
ALTER TABLE bulk_operations 
DROP COLUMN target_ids;

-- Add new column as JSONB
ALTER TABLE bulk_operations 
ADD COLUMN target_ids JSONB DEFAULT '[]'::jsonb;

-- Restore any existing data (converting UUID array to JSONB)
UPDATE bulk_operations bo
SET target_ids = (
    SELECT jsonb_agg(id::text)
    FROM unnest((SELECT target_ids FROM bulk_operations_backup WHERE id = bo.id)) AS id
)
WHERE EXISTS (SELECT 1 FROM bulk_operations_backup WHERE id = bo.id);

-- Also fix the bulk_operation_items table
ALTER TABLE bulk_operation_items 
ALTER COLUMN target_id TYPE TEXT;

-- Add comment explaining the change
COMMENT ON COLUMN bulk_operations.target_ids IS 'Flexible array of target IDs (can be UUIDs or strings) stored as JSONB';
COMMENT ON COLUMN bulk_operation_items.target_id IS 'Flexible target ID (can be UUID or string)';

-- Verify the changes
DO $$
BEGIN
    RAISE NOTICE 'Migration complete: target_ids column changed from UUID[] to JSONB';
END $$;