-- =====================================================
-- Manager Review Enhancements Migration
-- Migration 014: Enhanced manager review with Supabase Auth
-- =====================================================
-- Features:
-- 1. Edit tracking for OCR corrections
-- 2. Document access sessions (Supabase Auth OTP)
-- 3. Employer profile for auto-fill
-- 4. Analytics for continuous improvement
-- =====================================================

-- =====================================================
-- 1. FORM FIELD EDITS TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS form_field_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  manager_id UUID, -- References auth.users (Supabase managed)
  form_type VARCHAR(50) NOT NULL,  -- 'i9_section_2', 'w4', 'health_insurance'
  form_id UUID,

  -- Field details
  field_name VARCHAR(100) NOT NULL,
  field_label VARCHAR(200),

  -- Values
  original_value TEXT,              -- From OCR/auto-fill
  edited_value TEXT,                -- Manager correction

  -- OCR metadata
  ocr_confidence DECIMAL(3,2),      -- 0.00 to 1.00
  ocr_engine VARCHAR(50) DEFAULT 'google_document_ai',
  document_quality VARCHAR(20),     -- 'high', 'medium', 'low'

  -- Edit metadata
  edit_reason VARCHAR(50),          -- 'ocr_error', 'ocr_missed_char', 'format_issue', etc.
  edit_notes TEXT,

  -- Audit
  edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Analytics flags
  is_ocr_error BOOLEAN DEFAULT FALSE,
  error_category VARCHAR(50)        -- 'character_confusion', 'missing_char', etc.
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_field_edits_form_type ON form_field_edits(form_type);
CREATE INDEX IF NOT EXISTS idx_field_edits_field_name ON form_field_edits(field_name);
CREATE INDEX IF NOT EXISTS idx_field_edits_is_ocr_error ON form_field_edits(is_ocr_error) WHERE is_ocr_error = TRUE;
CREATE INDEX IF NOT EXISTS idx_field_edits_edited_at ON form_field_edits(edited_at);
CREATE INDEX IF NOT EXISTS idx_field_edits_manager ON form_field_edits(manager_id);
CREATE INDEX IF NOT EXISTS idx_field_edits_employee ON form_field_edits(employee_id);

-- =====================================================
-- 2. DOCUMENT ACCESS SESSIONS
-- =====================================================
-- Note: OTP verification is handled by Supabase Auth
-- We only track the sessions after successful OTP verification

CREATE TABLE IF NOT EXISTS document_access_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID, -- References auth.users (Supabase managed)
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,

  -- Session details
  session_token VARCHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- 30 minutes from creation
  is_active BOOLEAN DEFAULT TRUE,

  -- Verification method used
  verification_method VARCHAR(20),  -- 'sms' or 'email'
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Tracking
  documents_viewed JSONB DEFAULT '[]',

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_doc_session_manager ON document_access_sessions(manager_id);
CREATE INDEX IF NOT EXISTS idx_doc_session_employee ON document_access_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_doc_session_token ON document_access_sessions(session_token) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_doc_session_expires ON document_access_sessions(expires_at) WHERE is_active = TRUE;

-- =====================================================
-- 3. EMPLOYER PROFILES
-- =====================================================

CREATE TABLE IF NOT EXISTS employer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) UNIQUE,

  -- Company Info
  business_legal_name VARCHAR(255) NOT NULL,
  dba_name VARCHAR(255),

  -- Address
  street_address VARCHAR(255) NOT NULL,
  suite_apt VARCHAR(50),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,

  -- Contact
  phone VARCHAR(20) NOT NULL,
  fax VARCHAR(20),
  email VARCHAR(255) NOT NULL,
  website VARCHAR(255),

  -- Tax Info
  ein VARCHAR(20) NOT NULL,  -- XX-XXXXXXX format
  state_tax_id VARCHAR(50),

  -- I-9 Specific
  i9_employer_name VARCHAR(255) NOT NULL,
  i9_employer_title VARCHAR(100) NOT NULL,
  i9_business_name VARCHAR(255) NOT NULL,
  i9_business_address TEXT NOT NULL,

  -- W-4 Specific
  w4_employer_name_address TEXT NOT NULL,

  -- Health Insurance
  health_insurance_provider VARCHAR(255),
  health_insurance_group_number VARCHAR(100),
  health_insurance_contact VARCHAR(255),

  -- Metadata
  created_by UUID, -- References auth.users
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  version INT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_employer_profile_property ON employer_profiles(property_id);
CREATE INDEX IF NOT EXISTS idx_employer_profile_active ON employer_profiles(is_active) WHERE is_active = TRUE;

-- =====================================================
-- 4. EMPLOYER PROFILE HISTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS employer_profile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES employer_profiles(id) ON DELETE CASCADE,
  version INT NOT NULL,
  changed_fields JSONB NOT NULL,
  changed_by UUID, -- References auth.users
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_profile_history_profile ON employer_profile_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_history_changed_at ON employer_profile_history(changed_at);

-- =====================================================
-- 5. OCR ACCURACY ANALYTICS (Materialized View)
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS ocr_accuracy_analytics AS
SELECT
  form_type,
  field_name,
  COUNT(*) AS total_edits,
  COUNT(*) FILTER (WHERE is_ocr_error = TRUE) AS ocr_errors,
  ROUND(
    (COUNT(*) FILTER (WHERE is_ocr_error = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS error_rate_percent,
  AVG(ocr_confidence) AS avg_confidence,
  MODE() WITHIN GROUP (ORDER BY error_category) AS most_common_error,
  array_agg(DISTINCT edit_reason) AS edit_reasons,
  MAX(edited_at) AS last_edit_date
FROM form_field_edits
WHERE edited_at > NOW() - INTERVAL '30 days'
GROUP BY form_type, field_name
ORDER BY total_edits DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ocr_analytics_form_field ON ocr_accuracy_analytics(form_type, field_name);
CREATE INDEX IF NOT EXISTS idx_ocr_analytics_error_rate ON ocr_accuracy_analytics(error_rate_percent DESC);

-- =====================================================
-- 6. MANAGER EDIT PATTERNS
-- =====================================================

CREATE TABLE IF NOT EXISTS manager_edit_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID, -- References auth.users
  property_id UUID REFERENCES properties(id),

  -- Aggregated stats
  total_forms_reviewed INT DEFAULT 0,
  total_fields_edited INT DEFAULT 0,
  avg_edits_per_form DECIMAL(5,2),

  -- Common edits
  most_edited_fields JSONB,         -- {"document_number": 45, "expiration_date": 23}
  common_error_types JSONB,         -- {"ocr_error": 60, "format_issue": 15}

  -- Time tracking
  avg_review_time_seconds INT,

  -- Updated
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manager_patterns_manager ON manager_edit_patterns(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_patterns_property ON manager_edit_patterns(property_id);

-- =====================================================
-- 7. FUNCTIONS
-- =====================================================

-- Function to refresh OCR analytics
CREATE OR REPLACE FUNCTION refresh_ocr_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY ocr_accuracy_analytics;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE document_access_sessions
  SET is_active = FALSE, ended_at = NOW()
  WHERE expires_at < NOW() AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE form_field_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employer_profile_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_edit_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for form_field_edits
CREATE POLICY "Managers can view their own edits"
  ON form_field_edits FOR SELECT
  USING (auth.uid() = manager_id);

CREATE POLICY "Managers can insert edits"
  ON form_field_edits FOR INSERT
  WITH CHECK (auth.uid() = manager_id);

-- RLS Policies for document_access_sessions
CREATE POLICY "Managers can view their own sessions"
  ON document_access_sessions FOR SELECT
  USING (auth.uid() = manager_id);

CREATE POLICY "Managers can insert their own sessions"
  ON document_access_sessions FOR INSERT
  WITH CHECK (auth.uid() = manager_id);

CREATE POLICY "Managers can update their own sessions"
  ON document_access_sessions FOR UPDATE
  USING (auth.uid() = manager_id);

-- RLS Policies for employer_profiles
CREATE POLICY "Users can view their property profile"
  ON employer_profiles FOR SELECT
  USING (
    property_id IN (
      SELECT property_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Managers can update their property profile"
  ON employer_profiles FOR UPDATE
  USING (
    property_id IN (
      SELECT property_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Managers can insert their property profile"
  ON employer_profiles FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT property_id FROM users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 9. COMMENTS
-- =====================================================

COMMENT ON TABLE form_field_edits IS 'Tracks all manager edits to auto-filled form fields for continuous improvement';
COMMENT ON TABLE document_access_sessions IS 'Active document viewing sessions with 30-minute timeout (OTP verified via Supabase Auth)';
COMMENT ON TABLE employer_profiles IS 'Employer information for auto-filling I-9, W-4, and health insurance forms';
COMMENT ON TABLE employer_profile_history IS 'Version history of employer profile changes';
COMMENT ON TABLE manager_edit_patterns IS 'Aggregated statistics of manager editing patterns for analytics';
COMMENT ON MATERIALIZED VIEW ocr_accuracy_analytics IS 'Analytics for OCR accuracy and improvement recommendations';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

