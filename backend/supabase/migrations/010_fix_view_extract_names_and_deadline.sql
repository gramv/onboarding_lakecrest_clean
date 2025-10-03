-- =====================================================
-- Migration 010: Fix View to Extract Names and Calculate I-9 Deadline
-- =====================================================

-- Drop and recreate the view with correct field extraction
DROP VIEW IF EXISTS employees_pending_manager_review;

CREATE OR REPLACE VIEW employees_pending_manager_review AS
SELECT 
    e.id,
    -- Extract names from personal_info (try both camelCase and snake_case)
    COALESCE(
        e.personal_info->>'first_name',
        e.personal_info->>'firstName'
    ) as first_name,
    COALESCE(
        e.personal_info->>'last_name',
        e.personal_info->>'lastName'
    ) as last_name,
    COALESCE(
        e.personal_info->>'email',
        e.email
    ) as email,
    COALESCE(
        e.personal_info->>'job_title',
        e.position
    ) as position,
    e.property_id,
    e.manager_id,
    -- Use start_date if available, otherwise use onboarding_completed_at
    COALESCE(e.start_date, e.onboarding_completed_at::DATE) as start_date,
    e.onboarding_completed_at,
    e.manager_review_status,
    e.i9_section2_status,
    -- Calculate I-9 Section 2 deadline if not set
    -- Federal requirement: 3 business days from first day of work
    COALESCE(
        e.i9_section2_deadline,
        calculate_i9_section2_deadline(COALESCE(e.start_date, e.onboarding_completed_at::DATE))
    ) as i9_section2_deadline,
    get_i9_deadline_days_remaining(
        COALESCE(
            e.i9_section2_deadline,
            calculate_i9_section2_deadline(COALESCE(e.start_date, e.onboarding_completed_at::DATE))
        )
    ) as days_until_i9_deadline,
    CASE 
        WHEN COALESCE(
            e.i9_section2_deadline,
            calculate_i9_section2_deadline(COALESCE(e.start_date, e.onboarding_completed_at::DATE))
        ) IS NULL THEN 'no_deadline'
        WHEN COALESCE(
            e.i9_section2_deadline,
            calculate_i9_section2_deadline(COALESCE(e.start_date, e.onboarding_completed_at::DATE))
        )::DATE < CURRENT_DATE THEN 'overdue'
        WHEN get_i9_deadline_days_remaining(
            COALESCE(
                e.i9_section2_deadline,
                calculate_i9_section2_deadline(COALESCE(e.start_date, e.onboarding_completed_at::DATE))
            )
        ) <= 1 THEN 'urgent'
        WHEN get_i9_deadline_days_remaining(
            COALESCE(
                e.i9_section2_deadline,
                calculate_i9_section2_deadline(COALESCE(e.start_date, e.onboarding_completed_at::DATE))
            )
        ) <= 2 THEN 'warning'
        ELSE 'normal'
    END as i9_urgency_level,
    p.name as property_name
FROM employees e
LEFT JOIN properties p ON p.id = e.property_id
WHERE e.onboarding_status = 'completed'
AND e.onboarding_completed_at IS NOT NULL  -- ✅ Must have completion timestamp
AND COALESCE(e.manager_review_status, 'pending_review') IN ('pending_review', 'manager_reviewing')
AND e.personal_info IS NOT NULL;  -- ✅ Must have personal info

COMMENT ON VIEW employees_pending_manager_review IS 'Employees who have completed full onboarding and are awaiting manager review with calculated I-9 deadlines';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

