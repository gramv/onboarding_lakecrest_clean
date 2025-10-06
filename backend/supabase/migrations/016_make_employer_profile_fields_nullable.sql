-- Migration: Make optional fields nullable in employer_profiles
-- Reason: Quick-save modal doesn't collect all fields initially
-- They can be added later in full profile setup

ALTER TABLE employer_profiles
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN w4_employer_name_address DROP NOT NULL;

-- Add comments explaining these fields are optional for quick setup
COMMENT ON COLUMN employer_profiles.phone IS 'Optional - can be set during quick setup or later';
COMMENT ON COLUMN employer_profiles.email IS 'Optional - can be set during quick setup or later';
COMMENT ON COLUMN employer_profiles.w4_employer_name_address IS 'Optional - can be set during quick setup or later';

