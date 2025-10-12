-- Add manager review tracking columns to employees table

-- Add manager_review_status column
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS manager_review_status TEXT DEFAULT 'pending_review';

-- Add manager_reviewed_by column
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS manager_reviewed_by UUID REFERENCES users(id);

-- Add manager_review_started_at column
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS manager_review_started_at TIMESTAMPTZ;

-- Add manager_review_completed_at column
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS manager_review_completed_at TIMESTAMPTZ;

-- Add manager_review_comments column
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS manager_review_comments TEXT;

-- Add I-9 Section 2 tracking columns
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS i9_section2_completed_by UUID REFERENCES users(id);

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS i9_section2_status TEXT DEFAULT 'pending';

-- Add final signature tracking columns
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS final_signature_timestamp TIMESTAMPTZ;

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS final_signature_ip TEXT;

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS final_signature_user_agent TEXT;

-- Create index on manager_review_status for faster filtering
CREATE INDEX IF NOT EXISTS idx_employees_manager_review_status 
ON employees(manager_review_status);

-- Create index on manager_review_completed_at for faster filtering
CREATE INDEX IF NOT EXISTS idx_employees_manager_review_completed_at 
ON employees(manager_review_completed_at);

-- Add comment to document the columns
COMMENT ON COLUMN employees.manager_review_status IS 'Status of manager review: pending_review, manager_reviewing, completed, changes_requested';
COMMENT ON COLUMN employees.manager_reviewed_by IS 'Manager user ID who completed the review';
COMMENT ON COLUMN employees.manager_review_started_at IS 'Timestamp when manager started reviewing';
COMMENT ON COLUMN employees.manager_review_completed_at IS 'Timestamp when manager completed the review';
COMMENT ON COLUMN employees.manager_review_comments IS 'Comments from manager during review';

