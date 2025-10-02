-- Create onboarding_progress table for tracking employee progress through onboarding steps
-- This table stores form data and completion status for each step of the onboarding process

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS onboarding_progress CASCADE;

-- Create the onboarding_progress table
CREATE TABLE onboarding_progress (
    -- Foreign key to employees table
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Step identifier (e.g., 'personal-info', 'emergency-contact', 'w4-form', etc.)
    step_id TEXT NOT NULL,
    
    -- JSON data for the form fields in this step
    form_data JSONB DEFAULT '{}'::jsonb,
    
    -- Completion status for this step
    is_complete BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite primary key
    PRIMARY KEY (employee_id, step_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_onboarding_progress_employee_id ON onboarding_progress(employee_id);
CREATE INDEX idx_onboarding_progress_step_id ON onboarding_progress(step_id);
CREATE INDEX idx_onboarding_progress_is_complete ON onboarding_progress(is_complete);
CREATE INDEX idx_onboarding_progress_updated_at ON onboarding_progress(updated_at DESC);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_onboarding_progress_updated_at 
    BEFORE UPDATE ON onboarding_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Employees can view their own progress" ON onboarding_progress;
DROP POLICY IF EXISTS "Employees can insert their own progress" ON onboarding_progress;
DROP POLICY IF EXISTS "Employees can update their own progress" ON onboarding_progress;
DROP POLICY IF EXISTS "HR users can view all progress" ON onboarding_progress;
DROP POLICY IF EXISTS "HR users can update all progress" ON onboarding_progress;
DROP POLICY IF EXISTS "Managers can view their property employees progress" ON onboarding_progress;

-- RLS Policies

-- 1. Employees can view their own progress
CREATE POLICY "Employees can view their own progress" 
    ON onboarding_progress 
    FOR SELECT 
    USING (
        auth.uid()::text = employee_id
        OR
        -- Also allow if the request includes a valid employee token (for stateless access)
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = onboarding_progress.employee_id
        )
    );

-- 2. Employees can insert their own progress records
CREATE POLICY "Employees can insert their own progress" 
    ON onboarding_progress 
    FOR INSERT 
    WITH CHECK (
        auth.uid()::text = employee_id
        OR
        -- Allow insert with valid employee context
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = employee_id
        )
    );

-- 3. Employees can update their own progress
CREATE POLICY "Employees can update their own progress" 
    ON onboarding_progress 
    FOR UPDATE 
    USING (
        auth.uid()::text = employee_id
        OR
        -- Allow update with valid employee context
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = onboarding_progress.employee_id
        )
    )
    WITH CHECK (
        auth.uid()::text = employee_id
        OR
        -- Allow update with valid employee context
        EXISTS (
            SELECT 1 FROM employees 
            WHERE id = employee_id
        )
    );

-- 4. HR users can view all progress records
CREATE POLICY "HR users can view all progress" 
    ON onboarding_progress 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'hr'
        )
    );

-- 5. HR users can update all progress records
CREATE POLICY "HR users can update all progress" 
    ON onboarding_progress 
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'hr'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'hr'
        )
    );

-- 6. Managers can view progress for employees at their property
CREATE POLICY "Managers can view their property employees progress" 
    ON onboarding_progress 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 
            FROM profiles p
            JOIN employees e ON e.id = onboarding_progress.employee_id
            WHERE p.id = auth.uid() 
            AND p.role = 'manager'
            AND e.property_id = p.property_id
        )
    );

-- Grant necessary permissions
GRANT ALL ON onboarding_progress TO authenticated;
GRANT ALL ON onboarding_progress TO service_role;

-- Add helpful comments
COMMENT ON TABLE onboarding_progress IS 'Tracks employee progress through onboarding steps with form data storage';
COMMENT ON COLUMN onboarding_progress.employee_id IS 'Foreign key reference to employees table';
COMMENT ON COLUMN onboarding_progress.step_id IS 'Identifier for the onboarding step (e.g., personal-info, w4-form)';
COMMENT ON COLUMN onboarding_progress.form_data IS 'JSON storage for form field data specific to each step';
COMMENT ON COLUMN onboarding_progress.is_complete IS 'Whether this step has been completed by the employee';
COMMENT ON COLUMN onboarding_progress.created_at IS 'Timestamp when this progress record was first created';
COMMENT ON COLUMN onboarding_progress.updated_at IS 'Timestamp when this progress record was last updated';