-- Migration: Create document_approvals table
-- Created: 2025-10-04
-- Purpose: Track manager approval status for employee documents in sequential workflow

-- Create document_approvals table
CREATE TABLE IF NOT EXISTS document_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    form_data JSONB,
    signature TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one approval record per employee per document type
    UNIQUE(employee_id, document_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_approvals_employee_id ON document_approvals(employee_id);
CREATE INDEX IF NOT EXISTS idx_document_approvals_status ON document_approvals(status);
CREATE INDEX IF NOT EXISTS idx_document_approvals_document_type ON document_approvals(document_type);
CREATE INDEX IF NOT EXISTS idx_document_approvals_approved_by ON document_approvals(approved_by);

-- Enable RLS
ALTER TABLE document_approvals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Managers can view document approvals" ON document_approvals;
DROP POLICY IF EXISTS "Managers can create document approvals" ON document_approvals;
DROP POLICY IF EXISTS "Managers can update document approvals" ON document_approvals;

-- Policy: Managers can view document approvals for their property
CREATE POLICY "Managers can view document approvals"
ON document_approvals
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM employees e
        JOIN users u ON u.id = auth.uid()
        WHERE e.id = document_approvals.employee_id
        AND e.property_id = u.property_id
        AND u.role IN ('manager', 'hr', 'admin')
    )
);

-- Policy: Managers can create document approvals
CREATE POLICY "Managers can create document approvals"
ON document_approvals
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM employees e
        JOIN users u ON u.id = auth.uid()
        WHERE e.id = document_approvals.employee_id
        AND e.property_id = u.property_id
        AND u.role IN ('manager', 'hr', 'admin')
    )
);

-- Policy: Managers can update document approvals
CREATE POLICY "Managers can update document approvals"
ON document_approvals
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM employees e
        JOIN users u ON u.id = auth.uid()
        WHERE e.id = document_approvals.employee_id
        AND e.property_id = u.property_id
        AND u.role IN ('manager', 'hr', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM employees e
        JOIN users u ON u.id = auth.uid()
        WHERE e.id = document_approvals.employee_id
        AND e.property_id = u.property_id
        AND u.role IN ('manager', 'hr', 'admin')
    )
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON document_approvals TO authenticated;

-- Add helpful comments
COMMENT ON TABLE document_approvals IS 'Tracks manager approval status for employee documents in sequential workflow';
COMMENT ON COLUMN document_approvals.document_type IS 'Type of document: company_policies, i9, w4, direct_deposit, health_insurance';
COMMENT ON COLUMN document_approvals.status IS 'Approval status: pending, in_review, approved, rejected';
COMMENT ON COLUMN document_approvals.form_data IS 'Manager edits to form data (if any)';
COMMENT ON COLUMN document_approvals.signature IS 'Base64 encoded manager signature (for I-9 Section 2)';

