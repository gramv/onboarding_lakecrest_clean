-- =====================================================
-- VERIFICATION QUERIES FOR MIGRATION 014
-- Run these in Supabase SQL Editor to verify everything
-- =====================================================

-- 1. Check all new tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'form_field_edits',
    'document_access_sessions',
    'employer_profiles',
    'employer_profile_history',
    'manager_edit_patterns'
)
ORDER BY table_name;

-- 2. Check form_field_edits columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'form_field_edits'
ORDER BY ordinal_position;

-- 3. Check document_access_sessions columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'document_access_sessions'
ORDER BY ordinal_position;

-- 4. Check employer_profiles columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'employer_profiles'
ORDER BY ordinal_position;

-- 5. Check indexes were created
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE tablename IN (
    'form_field_edits',
    'document_access_sessions',
    'employer_profiles',
    'employer_profile_history',
    'manager_edit_patterns'
)
ORDER BY tablename, indexname;

-- 6. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN (
    'form_field_edits',
    'document_access_sessions',
    'employer_profiles',
    'employer_profile_history',
    'manager_edit_patterns'
)
ORDER BY tablename, policyname;

-- 7. Check materialized view exists
SELECT 
    schemaname,
    matviewname,
    definition
FROM pg_matviews
WHERE matviewname = 'ocr_accuracy_analytics';

-- 8. Check functions were created
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'refresh_ocr_analytics',
    'cleanup_expired_sessions'
)
ORDER BY routine_name;

-- 9. Test insert into form_field_edits (will fail if RLS is working correctly without auth)
-- This should fail with RLS error - that's good!
-- INSERT INTO form_field_edits (employee_id, form_type, field_name, original_value, edited_value)
-- VALUES (gen_random_uuid(), 'i9_section_2', 'test_field', 'old', 'new');

-- 10. Count records in each table (should be 0 for new tables)
SELECT 'form_field_edits' as table_name, COUNT(*) as record_count FROM form_field_edits
UNION ALL
SELECT 'document_access_sessions', COUNT(*) FROM document_access_sessions
UNION ALL
SELECT 'employer_profiles', COUNT(*) FROM employer_profiles
UNION ALL
SELECT 'employer_profile_history', COUNT(*) FROM employer_profile_history
UNION ALL
SELECT 'manager_edit_patterns', COUNT(*) FROM manager_edit_patterns;

-- =====================================================
-- EXPECTED RESULTS:
-- =====================================================
-- Query 1: Should show 5 tables
-- Query 2-4: Should show all columns for each table
-- Query 5: Should show indexes (at least 10 indexes total)
-- Query 6: Should show RLS policies (at least 8 policies)
-- Query 7: Should show ocr_accuracy_analytics materialized view
-- Query 8: Should show 2 functions
-- Query 10: Should show 0 records in all tables
-- =====================================================

