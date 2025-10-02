-- Create i9_documents table for storing I-9 supporting documents
-- Federal compliance requirement per 8 U.S.C. § 1324a

CREATE TABLE IF NOT EXISTS public.i9_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    document_list VARCHAR(10) NOT NULL CHECK (document_list IN ('list_a', 'list_b', 'list_c')),
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    file_url TEXT,
    storage_path TEXT,
    status VARCHAR(50) DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'verified', 'rejected', 'expired', 'pending')),
    document_number VARCHAR(255),
    issuing_authority VARCHAR(255),
    issue_date DATE,
    expiration_date DATE,
    metadata JSONB DEFAULT '{}',
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    verified_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_i9_documents_employee_id ON public.i9_documents(employee_id);
CREATE INDEX idx_i9_documents_document_list ON public.i9_documents(document_list);
CREATE INDEX idx_i9_documents_status ON public.i9_documents(status);
CREATE INDEX idx_i9_documents_created_at ON public.i9_documents(created_at DESC);

-- Add Row Level Security (RLS) policies
ALTER TABLE public.i9_documents ENABLE ROW LEVEL SECURITY;

-- Policy for employees to view their own documents
CREATE POLICY "Employees can view their own I-9 documents"
    ON public.i9_documents
    FOR SELECT
    USING (
        auth.uid()::text = employee_id 
        OR employee_id LIKE 'temp_%'  -- Allow temporary employee IDs for single-step invitations
    );

-- Policy for managers to view documents in their property
CREATE POLICY "Managers can view I-9 documents for their property"
    ON public.i9_documents
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('manager', 'hr')
        )
    );

-- Policy for inserting documents (allow for onboarding)
CREATE POLICY "Allow I-9 document uploads during onboarding"
    ON public.i9_documents
    FOR INSERT
    WITH CHECK (
        employee_id IS NOT NULL
        AND (
            auth.uid()::text = employee_id 
            OR employee_id LIKE 'temp_%'  -- Allow temporary employee IDs
            OR EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                AND u.role IN ('manager', 'hr')
            )
        )
    );

-- Policy for updating document status (managers/HR only)
CREATE POLICY "Managers can update I-9 document status"
    ON public.i9_documents
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('manager', 'hr')
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_i9_documents_updated_at 
    BEFORE UPDATE ON public.i9_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment for compliance documentation
COMMENT ON TABLE public.i9_documents IS 'Stores I-9 supporting documents for federal employment eligibility verification per USCIS requirements. Documents must satisfy either List A (identity + employment authorization) or List B (identity) + List C (employment authorization).';

-- Grant appropriate permissions
GRANT ALL ON public.i9_documents TO authenticated;
GRANT ALL ON public.i9_documents TO service_role;