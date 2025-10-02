-- Storage RLS Policies for Hotel Onboarding System
-- This script sets up Row-Level Security policies for Supabase storage buckets
-- Run this in your Supabase SQL Editor

-- ============================================
-- IMPORTANT: These policies allow service role full access
-- and provide controlled access for other users
-- ============================================

-- 1. Employee Documents Bucket
-- For sensitive documents like DL, SSN, voided checks
-- Service role: Full access
-- Authenticated users: No direct access (use signed URLs)

-- Allow service role to upload/update/delete
CREATE POLICY "Service role full access to employee-documents"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'employee-documents')
WITH CHECK (bucket_id = 'employee-documents');

-- Allow authenticated users to read their own documents (optional, currently using signed URLs)
-- CREATE POLICY "Employees can view own documents"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'employee-documents' AND auth.uid()::text = (storage.foldername(name))[2]);

-- 2. Generated Documents Bucket
-- For system-generated PDFs (W-4, I-9, Direct Deposit, etc.)
-- Service role: Full access
-- Others: Read-only with signed URLs

CREATE POLICY "Service role full access to generated-documents"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'generated-documents')
WITH CHECK (bucket_id = 'generated-documents');

-- 3. Onboarding Forms Bucket
-- For completed and signed forms
-- Service role: Full access

CREATE POLICY "Service role full access to onboarding-forms"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'onboarding-forms')
WITH CHECK (bucket_id = 'onboarding-forms');

-- 4. Employee Photos Bucket
-- For profile pictures and ID photos
-- Service role: Full access

CREATE POLICY "Service role full access to employee-photos"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'employee-photos')
WITH CHECK (bucket_id = 'employee-photos');

-- 5. Property Documents Bucket
-- For company policies, handbooks, etc.
-- Service role: Full access
-- Can be made public for certain documents

CREATE POLICY "Service role full access to property-documents"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'property-documents')
WITH CHECK (bucket_id = 'property-documents');

-- ============================================
-- Public Access Policies (Optional)
-- Uncomment if you want certain buckets to be publicly readable
-- ============================================

-- Make company assets publicly readable (logos, general policies)
-- CREATE POLICY "Public read access to property-documents"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'property-documents' AND storage.foldername(name)[1] = 'public');

-- ============================================
-- Manager Access Policies (Optional)
-- These would require proper authentication setup
-- ============================================

-- Allow managers to view documents for their property
-- CREATE POLICY "Managers can view property employee documents"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (
--     bucket_id IN ('employee-documents', 'generated-documents', 'onboarding-forms')
--     AND EXISTS (
--         SELECT 1 FROM managers
--         WHERE managers.user_id = auth.uid()
--         AND (storage.foldername(name))[1] = managers.property_id::text
--     )
-- );

-- ============================================
-- Verification Queries
-- Run these to verify policies are in place
-- ============================================

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- Check bucket permissions
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets
ORDER BY name;