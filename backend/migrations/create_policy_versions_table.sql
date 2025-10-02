-- Policy Version Tracking System Migration
-- This migration creates tables for tracking company policy versions
-- and employee acknowledgments for compliance purposes

-- 1. Create policy_versions table
CREATE TABLE IF NOT EXISTS policy_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    version_number VARCHAR(20) NOT NULL,
    effective_date DATE NOT NULL,
    policy_type VARCHAR(100) NOT NULL,
    content JSONB NOT NULL,
    changelog TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT false,
    property_id UUID,
    
    -- Constraints
    CONSTRAINT unique_active_policy_per_type_property 
        UNIQUE NULLS NOT DISTINCT (policy_type, property_id, is_active) 
        WHERE is_active = true,
    
    -- Index for faster lookups
    INDEX idx_policy_versions_type_active ON policy_versions(policy_type, is_active),
    INDEX idx_policy_versions_property ON policy_versions(property_id),
    INDEX idx_policy_versions_effective_date ON policy_versions(effective_date)
);

-- 2. Create employee_policy_acknowledgments table
CREATE TABLE IF NOT EXISTS employee_policy_acknowledgments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id VARCHAR(255) NOT NULL, -- Can be temp_xxx or actual employee ID
    policy_version_id UUID NOT NULL REFERENCES policy_versions(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    signature_data TEXT NOT NULL, -- Base64 encoded signature
    ip_address VARCHAR(45), -- Support both IPv4 and IPv6
    user_agent TEXT,
    document_id UUID, -- Reference to stored PDF document
    
    -- Prevent duplicate acknowledgments
    CONSTRAINT unique_employee_policy_ack UNIQUE (employee_id, policy_version_id),
    
    -- Indexes for faster queries
    INDEX idx_policy_acks_employee ON employee_policy_acknowledgments(employee_id),
    INDEX idx_policy_acks_version ON employee_policy_acknowledgments(policy_version_id),
    INDEX idx_policy_acks_date ON employee_policy_acknowledgments(acknowledged_at)
);

-- 3. Add comments for documentation
COMMENT ON TABLE policy_versions IS 'Tracks all versions of company policies for compliance and audit purposes';
COMMENT ON COLUMN policy_versions.version_number IS 'Semantic version number (e.g., 1.0, 1.1, 2.0)';
COMMENT ON COLUMN policy_versions.policy_type IS 'Type of policy: company_policies, weapons_policy, trafficking_awareness, etc.';
COMMENT ON COLUMN policy_versions.content IS 'JSON structure containing the full policy content and metadata';
COMMENT ON COLUMN policy_versions.changelog IS 'Description of what changed in this version';
COMMENT ON COLUMN policy_versions.is_active IS 'Only one version can be active per policy type and property';
COMMENT ON COLUMN policy_versions.property_id IS 'NULL for global policies, UUID for property-specific policies';

COMMENT ON TABLE employee_policy_acknowledgments IS 'Records employee acknowledgments of specific policy versions for compliance tracking';
COMMENT ON COLUMN employee_policy_acknowledgments.employee_id IS 'Can be temporary ID (temp_xxx) or permanent employee ID';
COMMENT ON COLUMN employee_policy_acknowledgments.signature_data IS 'Base64 encoded digital signature image';
COMMENT ON COLUMN employee_policy_acknowledgments.document_id IS 'Reference to the signed PDF document stored in the system';

-- 4. Create initial policy versions from existing data (if needed)
-- This is a data migration to populate initial versions
DO $$
BEGIN
    -- Check if we need to create initial versions
    IF NOT EXISTS (SELECT 1 FROM policy_versions LIMIT 1) THEN
        -- Create initial version for company policies
        INSERT INTO policy_versions (
            version_number,
            effective_date,
            policy_type,
            content,
            changelog,
            is_active
        ) VALUES (
            '1.0',
            CURRENT_DATE,
            'company_policies',
            jsonb_build_object(
                'title', 'Company Policies and Procedures',
                'sections', jsonb_build_array(
                    jsonb_build_object(
                        'title', 'Code of Conduct',
                        'content', 'Standard code of conduct policy content'
                    ),
                    jsonb_build_object(
                        'title', 'Safety Procedures',
                        'content', 'Workplace safety procedures'
                    )
                )
            ),
            'Initial version',
            true
        );
        
        -- Create initial version for weapons policy
        INSERT INTO policy_versions (
            version_number,
            effective_date,
            policy_type,
            content,
            changelog,
            is_active
        ) VALUES (
            '1.0',
            CURRENT_DATE,
            'weapons_policy',
            jsonb_build_object(
                'title', 'Weapons Policy',
                'content', 'No weapons are permitted on company premises'
            ),
            'Initial version',
            true
        );
        
        -- Create initial version for human trafficking awareness
        INSERT INTO policy_versions (
            version_number,
            effective_date,
            policy_type,
            content,
            changelog,
            is_active
        ) VALUES (
            '1.0',
            CURRENT_DATE,
            'trafficking_awareness',
            jsonb_build_object(
                'title', 'Human Trafficking Awareness',
                'hotline', '1-888-373-7888',
                'content', 'Human trafficking awareness and reporting procedures'
            ),
            'Initial version',
            true
        );
    END IF;
END $$;

-- 5. Create function to automatically deactivate old versions when activating a new one
CREATE OR REPLACE FUNCTION deactivate_old_policy_versions()
RETURNS TRIGGER AS $$
BEGIN
    -- If this version is being set to active
    IF NEW.is_active = true AND OLD.is_active = false THEN
        -- Deactivate all other versions of the same policy type for the same property
        UPDATE policy_versions
        SET is_active = false
        WHERE policy_type = NEW.policy_type
            AND (property_id IS NOT DISTINCT FROM NEW.property_id)
            AND id != NEW.id
            AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic deactivation
CREATE TRIGGER trigger_deactivate_old_versions
    BEFORE UPDATE ON policy_versions
    FOR EACH ROW
    EXECUTE FUNCTION deactivate_old_policy_versions();

-- 6. Create function to get active policy for a given type and property
CREATE OR REPLACE FUNCTION get_active_policy(
    p_policy_type VARCHAR,
    p_property_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    version_number VARCHAR,
    effective_date DATE,
    content JSONB,
    changelog TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pv.id,
        pv.version_number,
        pv.effective_date,
        pv.content,
        pv.changelog
    FROM policy_versions pv
    WHERE pv.policy_type = p_policy_type
        AND pv.is_active = true
        AND (
            -- Property-specific policy takes precedence
            pv.property_id = p_property_id
            OR 
            -- Fall back to global policy if no property-specific exists
            (pv.property_id IS NULL AND NOT EXISTS (
                SELECT 1 FROM policy_versions pv2
                WHERE pv2.policy_type = p_policy_type
                    AND pv2.property_id = p_property_id
                    AND pv2.is_active = true
            ))
        )
    ORDER BY pv.property_id DESC NULLS LAST -- Prioritize property-specific
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 7. Create view for compliance reporting
CREATE OR REPLACE VIEW policy_compliance_status AS
SELECT 
    e.id as employee_id,
    e.first_name,
    e.last_name,
    e.property_id,
    pv.policy_type,
    pv.version_number as current_version,
    pv.effective_date,
    ack.acknowledged_at,
    CASE 
        WHEN ack.id IS NOT NULL THEN 'Acknowledged'
        WHEN pv.effective_date > CURRENT_DATE THEN 'Not Yet Effective'
        ELSE 'Pending Acknowledgment'
    END as compliance_status
FROM employees e
CROSS JOIN (
    SELECT DISTINCT ON (policy_type, property_id) 
        id, policy_type, version_number, effective_date, property_id
    FROM policy_versions
    WHERE is_active = true
    ORDER BY policy_type, property_id, created_at DESC
) pv
LEFT JOIN employee_policy_acknowledgments ack 
    ON ack.employee_id = e.id 
    AND ack.policy_version_id = pv.id
WHERE (pv.property_id IS NULL OR pv.property_id = e.property_id);

-- 8. Add RLS policies for security
ALTER TABLE policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_policy_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Policy for HR users to manage policy versions
CREATE POLICY hr_manage_policies ON policy_versions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE user_id = auth.uid() 
            AND role = 'hr'
        )
    );

-- Policy for managers to view policies for their property
CREATE POLICY managers_view_policies ON policy_versions
    FOR SELECT
    TO authenticated
    USING (
        property_id IS NULL -- Global policies
        OR
        EXISTS (
            SELECT 1 FROM property_managers
            WHERE user_id = auth.uid()
            AND property_id = policy_versions.property_id
        )
    );

-- Policy for employees to view and acknowledge policies
CREATE POLICY employees_manage_acknowledgments ON employee_policy_acknowledgments
    FOR ALL
    TO authenticated
    USING (
        employee_id IN (
            SELECT id FROM employees WHERE user_id = auth.uid()
            UNION
            SELECT id FROM job_applications WHERE id::text = employee_id
        )
    );

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_policy_versions_created_at ON policy_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_acks_employee_date ON employee_policy_acknowledgments(employee_id, acknowledged_at DESC);

-- 10. Grant appropriate permissions
GRANT SELECT ON policy_versions TO anon, authenticated;
GRANT INSERT, UPDATE ON policy_versions TO authenticated;
GRANT SELECT, INSERT ON employee_policy_acknowledgments TO anon, authenticated;
GRANT SELECT ON policy_compliance_status TO authenticated;