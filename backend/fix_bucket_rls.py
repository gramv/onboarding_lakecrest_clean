#!/usr/bin/env python3
"""
Fix RLS on storage buckets - disable RLS since we're using service role
"""

from supabase import create_client, Client
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = "https://kzommszdhapvqpekpvnt.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6b21tc3pkaGFwdnFwZWtwdm50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc2NDExNywiZXhwIjoyMDcwMzQwMTE3fQ.58eZkTEw3l2Y9QxP1_ceVm7HPFmow-47aGmbyelpaZk"

def update_bucket_settings():
    """Update bucket settings to allow service role uploads"""
    logger.info("🔧 Updating bucket settings for service role access")
    logger.info("=" * 50)
    
    try:
        # Create Supabase client with service role
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        logger.info("✅ Connected to Supabase with service role")
        
        # List of buckets to update
        buckets = [
            'employee-documents',
            'generated-documents',
            'onboarding-forms',
            'employee-photos',
            'property-documents'
        ]
        
        # Unfortunately, we can't disable RLS directly via the Python client
        # But we can test if uploads work now
        
        logger.info("\n🧪 Testing direct upload to each bucket...")
        
        for bucket_name in buckets:
            try:
                # Test upload a small file
                test_content = f"Test file for {bucket_name}".encode()
                test_path = f"_test/rls_test_{bucket_name}.txt"
                
                # Try to upload
                result = supabase.storage.from_(bucket_name).upload(
                    test_path,
                    test_content,
                    file_options={"content-type": "text/plain", "upsert": "true"}
                )
                
                logger.info(f"✅ Upload to {bucket_name}: SUCCESS")
                
                # Clean up test file
                supabase.storage.from_(bucket_name).remove([test_path])
                
            except Exception as e:
                logger.error(f"❌ Upload to {bucket_name}: FAILED - {str(e)}")
                
                # If it's an RLS error, we need to handle it
                if "row-level security" in str(e).lower() or "violates" in str(e).lower():
                    logger.warning(f"   → RLS is blocking uploads to {bucket_name}")
                    logger.info(f"   → Attempting alternative approach...")
                    
                    # Try with upsert flag
                    try:
                        result = supabase.storage.from_(bucket_name).upload(
                            test_path,
                            test_content,
                            file_options={
                                "content-type": "text/plain",
                                "upsert": "true",
                                "x-upsert": "true"
                            }
                        )
                        logger.info(f"   ✅ Upsert worked for {bucket_name}")
                        supabase.storage.from_(bucket_name).remove([test_path])
                    except Exception as e2:
                        logger.error(f"   ❌ Upsert also failed: {str(e2)}")
        
        logger.info("\n📋 SOLUTION REQUIRED:")
        logger.info("Since RLS policies can't be applied via API, you need to:")
        logger.info("1. Go to Supabase Dashboard")
        logger.info("2. Navigate to Storage → Policies")
        logger.info("3. For each bucket, either:")
        logger.info("   a) Disable RLS entirely (simplest)")
        logger.info("   b) Add the policies from migrations/storage_rls_policies.sql")
        logger.info("\nOR")
        logger.info("\n4. Run this SQL in the SQL Editor to disable RLS on storage.objects:")
        
        sql_disable_rls = """
-- Disable RLS on storage.objects table (allows all operations with service role)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';
"""
        
        logger.info(sql_disable_rls)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error: {str(e)}")
        return False

def main():
    """Main execution"""
    logger.info("🚀 Storage Bucket RLS Fix")
    logger.info("=" * 50)
    
    update_bucket_settings()
    
    logger.info("\n✅ Testing complete!")
    logger.info("If uploads are still failing, apply the SQL above in Supabase Dashboard.")

if __name__ == "__main__":
    main()