-- =====================================================
-- Migration 009: Fix Pending Review View
-- Only show employees who ACTUALLY completed full onboarding
-- =====================================================

-- Drop and recreate the view with stricter criteria
DROP VIEW IF EXISTS employees_pending_manager_review;

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
    e.onboarding_completed_at,
    e.manager_review_status,
    e.i9_section2_status,
    e.i9_section2_deadline,
    get_i9_deadline_days_remaining(e.i9_section2_deadline) as days_until_i9_deadline,
    CASE 
        WHEN e.i9_section2_deadline IS NULL THEN 'no_deadline'
        WHEN e.i9_section2_deadline::DATE < CURRENT_DATE THEN 'overdue'
        WHEN get_i9_deadline_days_remaining(e.i9_section2_deadline) <= 1 THEN 'urgent'
        WHEN get_i9_deadline_days_remaining(e.i9_section2_deadline) <= 2 THEN 'warning'
        ELSE 'normal'
    END as i9_urgency_level,
    p.name as property_name
FROM employees e
LEFT JOIN properties p ON p.id = e.property_id
WHERE e.onboarding_status = 'completed'
AND e.onboarding_completed_at IS NOT NULL  -- ✅ Must have completion timestamp
AND COALESCE(e.manager_review_status, 'pending_review') IN ('pending_review', 'manager_reviewing')
AND e.personal_info IS NOT NULL  -- ✅ Must have personal info
AND e.personal_info->>'firstName' IS NOT NULL  -- ✅ Must have name
AND e.personal_info->>'lastName' IS NOT NULL;

COMMENT ON VIEW employees_pending_manager_review IS 'Employees who have completed full onboarding and are awaiting manager review';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

