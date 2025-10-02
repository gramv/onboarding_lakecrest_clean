#!/usr/bin/env python3
"""
Apply storage RLS policies to Supabase buckets
This script configures Row-Level Security policies for storage buckets
"""

import os
from supabase import create_client, Client
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Supabase credentials
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://kzommszdhapvqpekpvnt.supabase.co')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6b21tc3pkaGFwdnFwZWtwdm50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc2NDExNywiZXhwIjoyMDcwMzQwMTE3fQ.58eZkTEw3l2Y9QxP1_ceVm7HPFmow-47aGmbyelpaZk')

def apply_storage_policies():
    """Apply RLS policies for storage buckets"""
    
    logger.info("🔐 Applying Storage RLS Policies")
    logger.info("=" * 50)
    
    try:
        # Create Supabase client with service role key
        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        logger.info("✅ Connected to Supabase")
        
        # Define the SQL statements for RLS policies
        policies = [
            {
                "name": "employee-documents",
                "sql": """
                    DO $$
                    BEGIN
                        -- Drop existing policy if it exists
                        DROP POLICY IF EXISTS "Service role full access to employee-documents" ON storage.objects;
                        
                        -- Create new policy
                        CREATE POLICY "Service role full access to employee-documents"
                        ON storage.objects FOR ALL
                        TO service_role
                        USING (bucket_id = 'employee-documents')
                        WITH CHECK (bucket_id = 'employee-documents');
                        
                        RAISE NOTICE 'Policy created for employee-documents bucket';
                    EXCEPTION
                        WHEN others THEN
                            RAISE NOTICE 'Error creating policy for employee-documents: %', SQLERRM;
                    END $$;
                """
            },
            {
                "name": "generated-documents",
                "sql": """
                    DO $$
                    BEGIN
                        -- Drop existing policy if it exists
                        DROP POLICY IF EXISTS "Service role full access to generated-documents" ON storage.objects;
                        
                        -- Create new policy
                        CREATE POLICY "Service role full access to generated-documents"
                        ON storage.objects FOR ALL
                        TO service_role
                        USING (bucket_id = 'generated-documents')
                        WITH CHECK (bucket_id = 'generated-documents');
                        
                        RAISE NOTICE 'Policy created for generated-documents bucket';
                    EXCEPTION
                        WHEN others THEN
                            RAISE NOTICE 'Error creating policy for generated-documents: %', SQLERRM;
                    END $$;
                """
            },
            {
                "name": "onboarding-forms",
                "sql": """
                    DO $$
                    BEGIN
                        -- Drop existing policy if it exists
                        DROP POLICY IF EXISTS "Service role full access to onboarding-forms" ON storage.objects;
                        
                        -- Create new policy
                        CREATE POLICY "Service role full access to onboarding-forms"
                        ON storage.objects FOR ALL
                        TO service_role
                        USING (bucket_id = 'onboarding-forms')
                        WITH CHECK (bucket_id = 'onboarding-forms');
                        
                        RAISE NOTICE 'Policy created for onboarding-forms bucket';
                    EXCEPTION
                        WHEN others THEN
                            RAISE NOTICE 'Error creating policy for onboarding-forms: %', SQLERRM;
                    END $$;
                """
            },
            {
                "name": "employee-photos",
                "sql": """
                    DO $$
                    BEGIN
                        -- Drop existing policy if it exists
                        DROP POLICY IF EXISTS "Service role full access to employee-photos" ON storage.objects;
                        
                        -- Create new policy
                        CREATE POLICY "Service role full access to employee-photos"
                        ON storage.objects FOR ALL
                        TO service_role
                        USING (bucket_id = 'employee-photos')
                        WITH CHECK (bucket_id = 'employee-photos');
                        
                        RAISE NOTICE 'Policy created for employee-photos bucket';
                    EXCEPTION
                        WHEN others THEN
                            RAISE NOTICE 'Error creating policy for employee-photos: %', SQLERRM;
                    END $$;
                """
            },
            {
                "name": "property-documents",
                "sql": """
                    DO $$
                    BEGIN
                        -- Drop existing policy if it exists
                        DROP POLICY IF EXISTS "Service role full access to property-documents" ON storage.objects;
                        
                        -- Create new policy
                        CREATE POLICY "Service role full access to property-documents"
                        ON storage.objects FOR ALL
                        TO service_role
                        USING (bucket_id = 'property-documents')
                        WITH CHECK (bucket_id = 'property-documents');
                        
                        RAISE NOTICE 'Policy created for property-documents bucket';
                    EXCEPTION
                        WHEN others THEN
                            RAISE NOTICE 'Error creating policy for property-documents: %', SQLERRM;
                    END $$;
                """
            }
        ]
        
        # Note: Direct SQL execution through the Python client isn't supported
        # We need to use the Supabase dashboard or postgres connection
        
        logger.info("\n⚠️  IMPORTANT: RLS policies cannot be applied via the Python client")
        logger.info("Please follow these steps to apply the policies:\n")
        
        logger.info("1. Go to your Supabase Dashboard")
        logger.info("2. Navigate to SQL Editor")
        logger.info("3. Copy and run the SQL from: migrations/storage_rls_policies.sql")
        logger.info("\nOR use the SQL statements below:\n")
        
        # Print the SQL for manual execution
        for policy in policies:
            logger.info(f"\n-- Policy for {policy['name']} bucket:")
            logger.info(policy['sql'])
        
        # Alternative: Test if we can at least verify bucket access
        logger.info("\n📊 Testing current bucket access...")
        test_bucket_access(client)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        return False

def test_bucket_access(client: Client):
    """Test if we can access buckets with service role"""
    
    buckets_to_test = [
        'employee-documents',
        'generated-documents',
        'onboarding-forms',
        'employee-photos',
        'property-documents'
    ]
    
    for bucket_id in buckets_to_test:
        try:
            # Try to list files in the bucket (should work with service role)
            result = client.storage.from_(bucket_id).list()
            logger.info(f"✅ Can access bucket: {bucket_id}")
        except Exception as e:
            error_msg = str(e)
            if "row-level security" in error_msg.lower():
                logger.warning(f"⚠️  RLS policy needed for: {bucket_id}")
            else:
                logger.error(f"❌ Cannot access bucket {bucket_id}: {error_msg}")

def main():
    """Main execution"""
    logger.info("🚀 Storage RLS Policy Configuration")
    logger.info("=" * 50)
    logger.info(f"Supabase URL: {SUPABASE_URL}")
    
    apply_storage_policies()
    
    logger.info("\n📝 Next Steps:")
    logger.info("1. Run the SQL statements in your Supabase dashboard")
    logger.info("2. Test document uploads with: python3 test_document_persistence.py")
    logger.info("3. Verify all PDFs are being saved to Supabase")

if __name__ == "__main__":
    main()