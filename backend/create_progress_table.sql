-- Query 6: Create onboarding_progress table for saving form progress
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL,
    step_id VARCHAR(100) NOT NULL,
    form_data JSONB,
    is_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicate progress records
    UNIQUE(employee_id, step_id)
);

-- Add indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_employee_id 
    ON public.onboarding_progress(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_step_id 
    ON public.onboarding_progress(step_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_is_complete 
    ON public.onboarding_progress(is_complete);

-- Add RLS policies
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own progress
CREATE POLICY "Users can manage their own progress" ON public.onboarding_progress
    FOR ALL
    USING (auth.uid()::text = employee_id::text)
    WITH CHECK (auth.uid()::text = employee_id::text);

-- Allow service role full access
CREATE POLICY "Service role has full access" ON public.onboarding_progress
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role')
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_onboarding_progress_updated_at 
    BEFORE UPDATE ON public.onboarding_progress 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.onboarding_progress TO anon;
GRANT ALL ON public.onboarding_progress TO authenticated;
GRANT ALL ON public.onboarding_progress TO service_role;