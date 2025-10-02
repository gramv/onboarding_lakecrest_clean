-- Migration: Create document storage tables for production
-- Date: 2024-08-23
-- Purpose: Fix production issues with missing tables

-- 1. Create i9_forms table (CRITICAL - fixing production error)
CREATE TABLE IF NOT EXISTS i9_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id VARCHAR(255) NOT NULL,
  section VARCHAR(50) NOT NULL,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_i9_employee ON i9_forms(employee_id);
CREATE INDEX IF NOT EXISTS idx_i9_section ON i9_forms(section);

-- 2. Create w4_forms table for W-4 document storage
CREATE TABLE IF NOT EXISTS w4_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id VARCHAR(255) NOT NULL,
  data JSONB,
  pdf_url TEXT,
  signed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_w4_employee ON w4_forms(employee_id);

-- 3. Create signed_documents table for company policies and other signed docs
CREATE TABLE IF NOT EXISTS signed_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id VARCHAR(255) NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  document_name VARCHAR(255),
  pdf_url TEXT,
  pdf_data BYTEA, -- Optional: store PDF binary
  signed_at TIMESTAMP,
  signature_data TEXT,
  property_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_signed_docs_employee ON signed_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_signed_docs_type ON signed_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_signed_docs_property ON signed_documents(property_id);

-- Document types that will be stored:
-- 'company_policies' - Company Policies Acknowledgment
-- 'direct_deposit' - Direct Deposit Authorization (future)
-- 'human_trafficking_cert' - Human Trafficking Training Certificate (future)
-- 'health_insurance' - Health Insurance Enrollment (future)
-- 'emergency_contact' - Emergency Contact Form (future)
-- 'weapons_policy' - Weapons Policy Acknowledgment (future)

-- Grant permissions (adjust based on your Supabase RLS policies)
-- These are examples, adjust to match your security model
-- GRANT ALL ON i9_forms TO authenticated;
-- GRANT ALL ON w4_forms TO authenticated;
-- GRANT ALL ON signed_documents TO authenticated;