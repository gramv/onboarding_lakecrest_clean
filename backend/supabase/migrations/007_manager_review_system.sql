-- =====================================================
-- MANAGER REVIEW SYSTEM - DATABASE SCHEMA
-- Migration 007: Add manager review and I-9 Section 2 tracking
-- =====================================================

-- =====================================================
-- 1. ADD MANAGER REVIEW FIELDS TO EMPLOYEES TABLE
-- =====================================================

-- Add manager review status tracking
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS manager_review_status VARCHAR(50) DEFAULT 'pending_review',
ADD COLUMN IF NOT EXISTS manager_review_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS manager_review_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS manager_reviewed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS manager_review_comments TEXT;

-- Add I-9 Section 2 tracking
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS i9_section2_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS i9_section2_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS i9_section2_deadline DATE,
ADD COLUMN IF NOT EXISTS i9_section2_completed_by UUID REFERENCES users(id);

-- Add comments for documentation
COMMENT ON COLUMN employees.manager_review_status IS 'Status of manager review: pending_review, manager_reviewing, approved, changes_requested, rejected';
COMMENT ON COLUMN employees.i9_section2_status IS 'Status of I-9 Section 2: pending, in_progress, completed, overdue';
COMMENT ON COLUMN employees.i9_section2_deadline IS 'Federal deadline for I-9 Section 2 completion (3 business days from first day of work)';

-- =====================================================
-- 2. CREATE MANAGER REVIEW ACTIONS TABLE (AUDIT TRAIL)
-- =====================================================

CREATE TABLE IF NOT EXISTS manager_review_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  document_type VARCHAR(100),
  comments TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE manager_review_actions IS 'Audit trail of all manager review actions for compliance';
COMMENT ON COLUMN manager_review_actions.action_type IS 'Action types: started_review, viewed_document, added_note, requested_changes, completed_i9_section2, approved, rejected';
COMMENT ON COLUMN manager_review_actions.document_type IS 'Document being reviewed: i9_section1, w4, direct_deposit, health_insurance, etc.';
COMMENT ON COLUMN manager_review_actions.metadata IS 'Additional context: IP address, user agent, specific fields reviewed, etc.';

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for finding employees pending manager review
CREATE INDEX IF NOT EXISTS idx_employees_manager_review_status 
ON employees(manager_review_status, property_id) 
WHERE manager_review_status IN ('pending_review', 'manager_reviewing');

-- Index for I-9 Section 2 deadline tracking
CREATE INDEX IF NOT EXISTS idx_employees_i9_section2_deadline 
ON employees(i9_section2_deadline, i9_section2_status) 
WHERE i9_section2_status IN ('pending', 'in_progress');

-- Index for manager review actions by employee
CREATE INDEX IF NOT EXISTS idx_manager_review_actions_employee 
ON manager_review_actions(employee_id, created_at DESC);

-- Index for manager review actions by manager
CREATE INDEX IF NOT EXISTS idx_manager_review_actions_manager 
ON manager_review_actions(manager_id, created_at DESC);

-- =====================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on manager_review_actions table
ALTER TABLE manager_review_actions ENABLE ROW LEVEL SECURITY;

-- HR can see all review actions
CREATE POLICY "manager_review_actions_hr_full_access" ON manager_review_actions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'hr'
        )
    );

-- Managers can see review actions for employees in their properties
CREATE POLICY "manager_review_actions_manager_property_access" ON manager_review_actions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM property_managers pm
            JOIN users u ON u.id = pm.manager_id
            JOIN employees e ON e.property_id = pm.property_id
            WHERE u.id::text = auth.uid()::text 
            AND e.id = manager_review_actions.employee_id
        )
    );

-- Managers can insert their own review actions
CREATE POLICY "manager_review_actions_manager_insert" ON manager_review_actions
    FOR INSERT WITH CHECK (
        manager_id::text = auth.uid()::text
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'manager'
        )
    );

-- =====================================================
-- 5. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to calculate I-9 Section 2 deadline (3 business days from start date)
CREATE OR REPLACE FUNCTION calculate_i9_section2_deadline(start_date DATE)
RETURNS DATE AS $$
DECLARE
    deadline DATE;
    days_added INT := 0;
    calc_date DATE := start_date;
BEGIN
    -- Add 3 business days (excluding weekends)
    WHILE days_added < 3 LOOP
        calc_date := calc_date + 1;
        -- Skip weekends (0 = Sunday, 6 = Saturday)
        IF EXTRACT(DOW FROM calc_date) NOT IN (0, 6) THEN
            days_added := days_added + 1;
        END IF;
    END LOOP;

    RETURN calc_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_i9_section2_deadline IS 'Calculates I-9 Section 2 deadline: 3 business days from employee start date (federal requirement)';

-- Function to get days until I-9 deadline
CREATE OR REPLACE FUNCTION get_i9_deadline_days_remaining(deadline_date DATE)
RETURNS INT AS $$
BEGIN
    RETURN deadline_date - CURRENT_DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 6. CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for employees pending manager review
CREATE OR REPLACE VIEW employees_pending_manager_review AS
SELECT
    e.id,
    e.personal_info->>'firstName' as first_name,
    e.personal_info->>'lastName' as last_name,
    e.personal_info->>'email' as email,
    e.position,
    e.property_id,
    e.manager_id,
    e.start_date,
    e.created_at as onboarding_completed_at,
    e.manager_review_status,
    e.i9_section2_status,
    e.i9_section2_deadline,
    get_i9_deadline_days_remaining(e.i9_section2_deadline) as days_until_i9_deadline,
    CASE
        WHEN e.i9_section2_deadline < CURRENT_DATE THEN 'overdue'
        WHEN get_i9_deadline_days_remaining(e.i9_section2_deadline) <= 1 THEN 'urgent'
        WHEN get_i9_deadline_days_remaining(e.i9_section2_deadline) <= 2 THEN 'warning'
        ELSE 'normal'
    END as i9_urgency_level,
    p.name as property_name
FROM employees e
LEFT JOIN properties p ON p.id = e.property_id
WHERE e.onboarding_status = 'completed'
AND e.manager_review_status IN ('pending_review', 'manager_reviewing');

COMMENT ON VIEW employees_pending_manager_review IS 'Employees who have completed onboarding and are awaiting manager review';

-- View for I-9 Section 2 compliance tracking
CREATE OR REPLACE VIEW i9_section2_compliance_status AS
SELECT
    e.id,
    e.personal_info->>'firstName' as first_name,
    e.personal_info->>'lastName' as last_name,
    e.property_id,
    e.start_date,
    e.i9_section2_status,
    e.i9_section2_deadline,
    e.i9_section2_completed_at,
    get_i9_deadline_days_remaining(e.i9_section2_deadline) as days_remaining,
    CASE
        WHEN e.i9_section2_status = 'completed' THEN 'compliant'
        WHEN e.i9_section2_deadline < CURRENT_DATE THEN 'non_compliant'
        WHEN get_i9_deadline_days_remaining(e.i9_section2_deadline) <= 1 THEN 'at_risk'
        ELSE 'pending'
    END as compliance_status,
    p.name as property_name,
    u.first_name || ' ' || u.last_name as manager_name
FROM employees e
LEFT JOIN properties p ON p.id = e.property_id
LEFT JOIN users u ON u.id = e.manager_id
WHERE e.onboarding_status = 'completed'
AND e.i9_section2_status != 'completed';

COMMENT ON VIEW i9_section2_compliance_status IS 'I-9 Section 2 compliance tracking for federal audit purposes';

-- =====================================================
-- 7. SAMPLE DATA FOR TESTING (OPTIONAL - COMMENT OUT IN PRODUCTION)
-- =====================================================

-- Uncomment below to insert sample review action types for reference
/*
INSERT INTO manager_review_actions (employee_id, manager_id, action_type, comments, metadata)
SELECT 
    e.id,
    e.manager_id,
    'started_review',
    'Manager began reviewing employee onboarding documents',
    jsonb_build_object(
        'ip_address', '127.0.0.1',
        'user_agent', 'Sample Browser',
        'timestamp', NOW()
    )
FROM employees e
WHERE e.onboarding_status = 'completed'
LIMIT 1;
*/

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================

-- Run these queries to verify the migration was successful:

-- Check new columns exist
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'employees' 
-- AND column_name LIKE '%review%' OR column_name LIKE '%i9_section2%';

-- Check indexes were created
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN ('employees', 'manager_review_actions');

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'manager_review_actions';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

