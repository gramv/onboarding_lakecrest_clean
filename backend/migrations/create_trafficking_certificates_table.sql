-- Create table for tracking Human Trafficking Training Certificates
CREATE TABLE IF NOT EXISTS trafficking_certificates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    certificate_id VARCHAR(50) UNIQUE NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    property_id VARCHAR(255) NOT NULL,
    property_name VARCHAR(255) NOT NULL,
    
    -- Certificate dates
    training_date DATE NOT NULL,
    issue_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Signature data
    signature_data JSONB,
    signature_ip VARCHAR(45),
    signature_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- Certificate document
    pdf_base64 TEXT,
    
    -- Tracking
    is_valid BOOLEAN DEFAULT true,
    renewal_reminder_sent BOOLEAN DEFAULT false,
    renewed_certificate_id VARCHAR(50),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_trafficking_cert_employee ON trafficking_certificates(employee_id);
CREATE INDEX idx_trafficking_cert_property ON trafficking_certificates(property_id);
CREATE INDEX idx_trafficking_cert_expiry ON trafficking_certificates(expiry_date);
CREATE INDEX idx_trafficking_cert_valid ON trafficking_certificates(is_valid, expiry_date);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_trafficking_cert_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trafficking_cert_updated_at
    BEFORE UPDATE ON trafficking_certificates
    FOR EACH ROW
    EXECUTE FUNCTION update_trafficking_cert_updated_at();

-- Create view for certificates expiring soon (within 30 days)
CREATE OR REPLACE VIEW expiring_trafficking_certificates AS
SELECT 
    tc.*,
    EXTRACT(DAY FROM (expiry_date - CURRENT_TIMESTAMP)) as days_until_expiry
FROM trafficking_certificates tc
WHERE 
    is_valid = true 
    AND expiry_date BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '30 days'
ORDER BY expiry_date ASC;

-- Create view for expired certificates
CREATE OR REPLACE VIEW expired_trafficking_certificates AS
SELECT 
    tc.*,
    EXTRACT(DAY FROM (CURRENT_TIMESTAMP - expiry_date)) as days_expired
FROM trafficking_certificates tc
WHERE 
    expiry_date < CURRENT_TIMESTAMP
ORDER BY expiry_date DESC;

-- Function to check and update certificate validity
CREATE OR REPLACE FUNCTION check_certificate_validity()
RETURNS void AS $$
BEGIN
    UPDATE trafficking_certificates
    SET is_valid = false
    WHERE expiry_date < CURRENT_TIMESTAMP AND is_valid = true;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for property-based access
ALTER TABLE trafficking_certificates ENABLE ROW LEVEL SECURITY;

-- Policy for HR to see all certificates
CREATE POLICY hr_view_all_certificates ON trafficking_certificates
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'hr'
        )
    );

-- Policy for managers to see only their property's certificates
CREATE POLICY manager_view_property_certificates ON trafficking_certificates
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM property_managers pm
            JOIN users u ON u.id = pm.user_id
            WHERE u.id = auth.uid()
            AND pm.property_id = trafficking_certificates.property_id
        )
    );

-- Policy for employees to see their own certificates
CREATE POLICY employee_view_own_certificates ON trafficking_certificates
    FOR SELECT
    TO authenticated
    USING (
        employee_id = auth.uid()::text
    );