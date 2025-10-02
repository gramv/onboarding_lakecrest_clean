-- Migration: Add performance tracking columns to existing tables
-- Date: 2025-08-07
-- Description: Adds performance tracking and optimization columns to existing tables

-- ============================================
-- Add performance tracking to job_applications table
-- ============================================
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS time_to_hire_hours INTEGER;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS average_review_time_ms INTEGER;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS source_channel TEXT; -- 'website', 'mobile', 'kiosk', 'partner'
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,2);
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS quality_score INTEGER; -- 0-100 score based on completeness

-- Calculate time_to_hire for existing records
UPDATE job_applications 
SET time_to_hire_hours = EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600
WHERE status IN ('approved', 'rejected') AND time_to_hire_hours IS NULL;

-- ============================================
-- Add performance tracking to employees table
-- ============================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS onboarding_completion_time_hours INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS forms_completion_percentage DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS document_upload_count INTEGER DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS engagement_score INTEGER; -- 0-100 based on activity
ALTER TABLE employees ADD COLUMN IF NOT EXISTS compliance_score INTEGER; -- 0-100 based on deadline adherence
ALTER TABLE employees ADD COLUMN IF NOT EXISTS training_modules_completed INTEGER DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS average_form_completion_time_ms INTEGER;

-- ============================================
-- Add performance tracking to properties table
-- ============================================
ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_employees_onboarded INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS average_onboarding_time_hours DECIMAL(10,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS compliance_rate DECIMAL(5,2); -- Percentage of compliant onboardings
ALTER TABLE properties ADD COLUMN IF NOT EXISTS employee_retention_rate DECIMAL(5,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS last_onboarding_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS monthly_application_count INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,2); -- Applications to hires
ALTER TABLE properties ADD COLUMN IF NOT EXISTS performance_tier TEXT; -- 'platinum', 'gold', 'silver', 'bronze'

-- ============================================
-- Add performance tracking to users table (managers/HR)
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS average_session_duration_seconds INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tasks_completed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS average_response_time_hours DECIMAL(10,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_rate DECIMAL(5,2); -- For managers
ALTER TABLE users ADD COLUMN IF NOT EXISTS actions_per_session DECIMAL(10,2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS performance_rating DECIMAL(3,2); -- 0.00 to 5.00

-- ============================================
-- Add performance tracking to notifications table
-- ============================================
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivery_time_ms INTEGER;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_time_ms INTEGER;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS click_through BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS engagement_action TEXT; -- Action taken after reading

-- ============================================
-- Add performance tracking to audit_logs table
-- ============================================
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS affected_rows INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS query_complexity TEXT; -- 'simple', 'moderate', 'complex'

-- ============================================
-- Create indexes for performance queries
-- ============================================

-- Job applications performance indexes
CREATE INDEX IF NOT EXISTS idx_job_applications_processing_time ON job_applications(processing_time_ms) WHERE processing_time_ms IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_applications_time_to_hire ON job_applications(time_to_hire_hours) WHERE time_to_hire_hours IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_applications_source_channel ON job_applications(source_channel) WHERE source_channel IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_applications_quality_score ON job_applications(quality_score) WHERE quality_score IS NOT NULL;

-- Employees performance indexes
CREATE INDEX IF NOT EXISTS idx_employees_last_activity ON employees(last_activity_at DESC) WHERE last_activity_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_compliance_score ON employees(compliance_score) WHERE compliance_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_onboarding_time ON employees(onboarding_completion_time_hours) WHERE onboarding_completion_time_hours IS NOT NULL;

-- Properties performance indexes
CREATE INDEX IF NOT EXISTS idx_properties_performance_tier ON properties(performance_tier) WHERE performance_tier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_compliance_rate ON properties(compliance_rate) WHERE compliance_rate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_last_onboarding ON properties(last_onboarding_at DESC) WHERE last_onboarding_at IS NOT NULL;

-- Users performance indexes
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC) WHERE last_login_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_login_count ON users(login_count) WHERE login_count > 0;
CREATE INDEX IF NOT EXISTS idx_users_performance_rating ON users(performance_rating) WHERE performance_rating IS NOT NULL;

-- ============================================
-- Create functions for automatic performance calculations
-- ============================================

-- Function to update employee onboarding completion time
CREATE OR REPLACE FUNCTION calculate_onboarding_completion_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.onboarding_status = 'completed' AND OLD.onboarding_status != 'completed' THEN
        NEW.onboarding_completion_time_hours := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - NEW.created_at)) / 3600;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for employee onboarding completion
CREATE TRIGGER calculate_onboarding_time_trigger
    BEFORE UPDATE ON employees
    FOR EACH ROW
    WHEN (NEW.onboarding_status IS DISTINCT FROM OLD.onboarding_status)
    EXECUTE FUNCTION calculate_onboarding_completion_time();

-- Function to update user login statistics
CREATE OR REPLACE FUNCTION update_user_login_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be called from the application layer when user logs in
    -- Placeholder for login tracking logic
    NEW.login_count := COALESCE(OLD.login_count, 0) + 1;
    NEW.last_login_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate property performance metrics
CREATE OR REPLACE FUNCTION update_property_performance_metrics()
RETURNS TRIGGER AS $$
DECLARE
    v_total_applications INTEGER;
    v_total_hires INTEGER;
BEGIN
    -- Calculate total employees onboarded
    SELECT COUNT(*) INTO NEW.total_employees_onboarded
    FROM employees
    WHERE property_id = NEW.id AND onboarding_status = 'completed';
    
    -- Calculate average onboarding time
    SELECT AVG(onboarding_completion_time_hours) INTO NEW.average_onboarding_time_hours
    FROM employees
    WHERE property_id = NEW.id AND onboarding_completion_time_hours IS NOT NULL;
    
    -- Calculate conversion rate
    SELECT COUNT(*) INTO v_total_applications
    FROM job_applications
    WHERE property_id = NEW.id;
    
    SELECT COUNT(*) INTO v_total_hires
    FROM job_applications
    WHERE property_id = NEW.id AND status = 'approved';
    
    IF v_total_applications > 0 THEN
        NEW.conversion_rate := (v_total_hires::DECIMAL / v_total_applications::DECIMAL) * 100;
    END IF;
    
    -- Determine performance tier based on metrics
    IF NEW.compliance_rate >= 95 AND NEW.conversion_rate >= 30 THEN
        NEW.performance_tier := 'platinum';
    ELSIF NEW.compliance_rate >= 85 AND NEW.conversion_rate >= 20 THEN
        NEW.performance_tier := 'gold';
    ELSIF NEW.compliance_rate >= 75 AND NEW.conversion_rate >= 10 THEN
        NEW.performance_tier := 'silver';
    ELSE
        NEW.performance_tier := 'bronze';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Add comments for documentation
-- ============================================
COMMENT ON COLUMN job_applications.processing_time_ms IS 'Time taken to process the application in milliseconds';
COMMENT ON COLUMN job_applications.time_to_hire_hours IS 'Total time from application to hire decision in hours';
COMMENT ON COLUMN job_applications.quality_score IS 'Application quality score (0-100) based on completeness and accuracy';

COMMENT ON COLUMN employees.onboarding_completion_time_hours IS 'Time taken to complete onboarding in hours';
COMMENT ON COLUMN employees.compliance_score IS 'Compliance score (0-100) based on deadline adherence and form completion';
COMMENT ON COLUMN employees.engagement_score IS 'Engagement score (0-100) based on activity and interaction';

COMMENT ON COLUMN properties.performance_tier IS 'Performance tier classification: platinum, gold, silver, or bronze';
COMMENT ON COLUMN properties.compliance_rate IS 'Percentage of compliant onboardings at this property';

COMMENT ON COLUMN users.performance_rating IS 'User performance rating from 0.00 to 5.00';
COMMENT ON COLUMN users.average_response_time_hours IS 'Average time to respond to assigned tasks in hours';