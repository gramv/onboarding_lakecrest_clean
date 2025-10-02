-- Create step_invitations table for HR to send individual onboarding steps via email
-- Migration: 013_create_step_invitations_table.sql

CREATE TABLE IF NOT EXISTS step_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    step_id VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    employee_id UUID,
    sent_by UUID NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    token VARCHAR(255) NOT NULL,
    property_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    session_id UUID,
    FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_invitations_token ON step_invitations(token);
CREATE INDEX idx_invitations_status ON step_invitations(status);
CREATE INDEX idx_invitations_property ON step_invitations(property_id);
CREATE INDEX idx_invitations_recipient_email ON step_invitations(recipient_email);
CREATE INDEX idx_invitations_employee ON step_invitations(employee_id);
CREATE INDEX idx_invitations_sent_at ON step_invitations(sent_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE step_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: HR users can see all invitations for their properties
CREATE POLICY "HR can view step invitations for their properties"
ON step_invitations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'hr'
        AND users.property_id = step_invitations.property_id
    )
);

-- Policy: HR users can create invitations for their properties
CREATE POLICY "HR can create step invitations for their properties"
ON step_invitations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'hr'
        AND users.property_id = step_invitations.property_id
    )
);

-- Policy: HR users can update invitations for their properties
CREATE POLICY "HR can update step invitations for their properties"
ON step_invitations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'hr'
        AND users.property_id = step_invitations.property_id
    )
);

-- Policy: Managers can see invitations for their properties  
CREATE POLICY "Managers can view step invitations for their properties"
ON step_invitations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'manager'
        AND users.property_id = step_invitations.property_id
    )
);

-- Add comment for documentation
COMMENT ON TABLE step_invitations IS 'Stores individual step invitations sent by HR to specific email addresses';
COMMENT ON COLUMN step_invitations.step_id IS 'The onboarding step ID (e.g., w4-form, i9-section1, etc.)';
COMMENT ON COLUMN step_invitations.status IS 'Status: pending, viewed, completed, expired';
COMMENT ON COLUMN step_invitations.token IS 'Secure token for accessing the specific step';