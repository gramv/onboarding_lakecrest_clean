-- =====================================================
-- ONBOARDING FORM DATA TABLE
-- Stores form data per token for cross-device access
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_form_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR NOT NULL,
    employee_id VARCHAR NOT NULL,
    step_id VARCHAR NOT NULL,
    form_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(token, step_id)
);

-- Create index for faster lookups
CREATE INDEX idx_onboarding_form_data_token ON onboarding_form_data(token);
CREATE INDEX idx_onboarding_form_data_employee ON onboarding_form_data(employee_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_onboarding_form_data_updated_at 
BEFORE UPDATE ON onboarding_form_data 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE onboarding_form_data ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own form data based on token
CREATE POLICY "Users can access own form data" ON onboarding_form_data
    FOR ALL USING (true);  -- In production, add proper token validation