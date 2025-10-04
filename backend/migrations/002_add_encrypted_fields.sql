-- ============================================
-- Field-Level Encryption Migration
-- Created: 2025-10-03
-- Purpose: Add encrypted columns for sensitive PII
-- ============================================

-- Add encrypted columns to employees table
-- We keep the old columns for backwards compatibility during migration
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS ssn_encrypted TEXT,
ADD COLUMN IF NOT EXISTS bank_account_encrypted TEXT,
ADD COLUMN IF NOT EXISTS bank_routing_encrypted TEXT;

-- Create indexes for encrypted fields (for existence checks, not searching)
CREATE INDEX IF NOT EXISTS idx_employees_ssn_encrypted 
  ON employees(ssn_encrypted) 
  WHERE ssn_encrypted IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_bank_account_encrypted 
  ON employees(bank_account_encrypted) 
  WHERE bank_account_encrypted IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employees_bank_routing_encrypted 
  ON employees(bank_routing_encrypted) 
  WHERE bank_routing_encrypted IS NOT NULL;

-- Add comments explaining encryption
COMMENT ON COLUMN employees.ssn_encrypted IS 'Encrypted SSN using Fernet (AES-128-CBC). Encrypted at application layer before storage.';
COMMENT ON COLUMN employees.bank_account_encrypted IS 'Encrypted bank account number using Fernet (AES-128-CBC). Encrypted at application layer before storage.';
COMMENT ON COLUMN employees.bank_routing_encrypted IS 'Encrypted bank routing number using Fernet (AES-128-CBC). Encrypted at application layer before storage.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Encrypted columns added to employees table';
  RAISE NOTICE '✅ Indexes created for encrypted fields';
  RAISE NOTICE '✅ Ready for field-level encryption';
  RAISE NOTICE '';
  RAISE NOTICE 'New columns:';
  RAISE NOTICE '  - ssn_encrypted (TEXT)';
  RAISE NOTICE '  - bank_account_encrypted (TEXT)';
  RAISE NOTICE '  - bank_routing_encrypted (TEXT)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Set FIELD_ENCRYPTION_KEY in environment';
  RAISE NOTICE '  2. Deploy backend with encryption service';
  RAISE NOTICE '  3. Migrate existing data (if any)';
END $$;

