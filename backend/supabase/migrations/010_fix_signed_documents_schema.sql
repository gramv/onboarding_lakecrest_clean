-- =====================================================
-- Migration 010: Fix signed_documents Schema
-- Add missing columns for signature metadata
-- =====================================================

-- Add missing columns to signed_documents table
ALTER TABLE signed_documents 
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add comments
COMMENT ON COLUMN signed_documents.ip_address IS 'IP address when document was signed';
COMMENT ON COLUMN signed_documents.user_agent IS 'User agent when document was signed';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

