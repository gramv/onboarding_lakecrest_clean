-- Simple version for Supabase SQL Editor
-- Create onboarding_progress table

-- Create the table
CREATE TABLE IF NOT EXISTS onboarding_progress (
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    form_data JSONB DEFAULT '{}'::jsonb,
    is_complete BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (employee_id, step_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_employee_id ON onboarding_progress(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_step_id ON onboarding_progress(step_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_is_complete ON onboarding_progress(is_complete);

-- Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_onboarding_progress_updated_at ON onboarding_progress;
CREATE TRIGGER update_onboarding_progress_updated_at 
    BEFORE UPDATE ON onboarding_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows authenticated users full access to their own data
CREATE POLICY "Users can manage their own progress" 
    ON onboarding_progress 
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON onboarding_progress TO authenticated;
GRANT ALL ON onboarding_progress TO service_role;
GRANT ALL ON onboarding_progress TO anon;