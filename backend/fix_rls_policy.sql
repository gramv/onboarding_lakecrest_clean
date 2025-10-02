-- Fix RLS policies for step_invitations table
-- The current policy only allows HR users when authenticated through Supabase Auth
-- But our backend uses service role which needs different handling

-- Drop existing policies
DROP POLICY IF EXISTS "HR users can manage invitations" ON step_invitations;
DROP POLICY IF EXISTS "Employees can view their invitations" ON step_invitations;

-- Option 1: Temporarily disable RLS (for testing)
-- Uncomment this if you want to test without RLS
-- ALTER TABLE step_invitations DISABLE ROW LEVEL SECURITY;

-- Option 2: Create more permissive policies that work with service role
-- This allows the backend (using service role) to manage invitations

-- Allow authenticated service role to do everything
CREATE POLICY "Service role can manage invitations" ON step_invitations
    FOR ALL
    USING (auth.role() = 'service_role');

-- Allow HR users to manage invitations (when using Supabase Auth directly)
CREATE POLICY "HR users can manage invitations" ON step_invitations
    FOR ALL
    USING (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'hr'
        )
    );

-- Allow anyone to view invitations meant for them
CREATE POLICY "Recipients can view their invitations" ON step_invitations
    FOR SELECT
    USING (
        recipient_email = auth.email()
        OR
        employee_id IN (
            SELECT e.id FROM employees e
            JOIN users u ON e.user_id = u.id
            WHERE u.id = auth.uid()
        )
    );

-- Verify the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'step_invitations';

-- Alternative: If you want to completely bypass RLS for backend operations
-- while keeping it for direct Supabase access, run this instead:
-- ALTER TABLE step_invitations DISABLE ROW LEVEL SECURITY;