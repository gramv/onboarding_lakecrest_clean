-- Create step_invitations table for HR to send individual forms
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
    FOREIGN KEY (sent_by) REFERENCES users(id),
    FOREIGN KEY (property_id) REFERENCES properties(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_token ON step_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON step_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_property ON step_invitations(property_id);

-- Enable RLS
ALTER TABLE step_invitations ENABLE ROW LEVEL SECURITY;

-- Create policy for HR users to manage invitations
CREATE POLICY "HR users can manage invitations" ON step_invitations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'hr'
        )
    );

-- Create policy for employees to view their own invitations
CREATE POLICY "Employees can view their invitations" ON step_invitations
    FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM employees
            WHERE employees.email = auth.email()
        )
    );