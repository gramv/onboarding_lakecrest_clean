-- Fix RLS policies to use property_managers table consistently
-- This script ensures all manager access is based on property_managers table

-- =====================================================
-- 1. DROP EXISTING CONFLICTING POLICIES
-- =====================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "job_applications_policy" ON job_applications;
DROP POLICY IF EXISTS "properties_policy" ON properties;
DROP POLICY IF EXISTS "employees_policy" ON employees;
DROP POLICY IF EXISTS "managers_policy" ON managers;

-- Drop any policies using old JWT property_id approach
DROP POLICY IF EXISTS "Manager access to applications" ON job_applications;
DROP POLICY IF EXISTS "Manager access to properties" ON properties;
DROP POLICY IF EXISTS "Manager access to employees" ON employees;

-- =====================================================
-- 2. ENABLE RLS ON KEY TABLES
-- =====================================================

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_managers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. CREATE CONSISTENT RLS POLICIES USING PROPERTY_MANAGERS TABLE
-- =====================================================

-- Job Applications: HR sees all, managers see only their assigned properties
CREATE POLICY "job_applications_hr_full_access" ON job_applications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'hr'
        )
    );

CREATE POLICY "job_applications_manager_property_access" ON job_applications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM property_managers pm
            JOIN users u ON u.id = pm.manager_id
            WHERE u.id::text = auth.uid()::text 
            AND pm.property_id = job_applications.property_id
        )
    );

-- Properties: HR sees all, managers see only assigned properties
CREATE POLICY "properties_hr_full_access" ON properties
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'hr'
        )
    );

CREATE POLICY "properties_manager_assigned_access" ON properties
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM property_managers pm
            JOIN users u ON u.id = pm.manager_id
            WHERE u.id::text = auth.uid()::text 
            AND pm.property_id = properties.id
        )
    );

-- Employees: HR sees all, managers see only their property employees
CREATE POLICY "employees_hr_full_access" ON employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'hr'
        )
    );

CREATE POLICY "employees_manager_property_access" ON employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM property_managers pm
            JOIN users u ON u.id = pm.manager_id
            WHERE u.id::text = auth.uid()::text 
            AND pm.property_id = employees.property_id
        )
    );

-- Property Managers: HR can manage all, managers can view their own assignments
CREATE POLICY "property_managers_hr_full_access" ON property_managers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text AND role = 'hr'
        )
    );

CREATE POLICY "property_managers_manager_view_own" ON property_managers
    FOR SELECT USING (
        manager_id::text = auth.uid()::text
    );

-- =====================================================
-- 4. SERVICE ROLE BYPASS (for backend operations)
-- =====================================================

-- Allow service role to bypass RLS for all operations
CREATE POLICY "service_role_bypass_job_applications" ON job_applications
    FOR ALL TO service_role USING (true);

CREATE POLICY "service_role_bypass_employees" ON employees
    FOR ALL TO service_role USING (true);

CREATE POLICY "service_role_bypass_properties" ON properties
    FOR ALL TO service_role USING (true);

CREATE POLICY "service_role_bypass_property_managers" ON property_managers
    FOR ALL TO service_role USING (true);

-- =====================================================
-- 5. VERIFY POLICIES
-- =====================================================

-- Check that policies were created successfully
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('job_applications', 'employees', 'properties', 'property_managers')
ORDER BY tablename, policyname;
