-- =====================================================
-- Migration 017: helper function to ensure document_approvals row exists
-- =====================================================

BEGIN;

CREATE OR REPLACE FUNCTION insert_document_approval(
    p_employee_id UUID,
    p_document_type TEXT,
    p_status TEXT DEFAULT 'pending'
)
RETURNS void AS $$
BEGIN
    INSERT INTO document_approvals (employee_id, document_type, status)
    VALUES (p_employee_id, p_document_type, p_status)
    ON CONFLICT (employee_id, document_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION insert_document_approval(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION insert_document_approval IS 'Ensures a document_approvals row exists for the given employee/document';

COMMIT;

