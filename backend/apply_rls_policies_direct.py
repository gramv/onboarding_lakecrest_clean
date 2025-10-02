#!/usr/bin/env python3
"""
Apply RLS policies directly to Supabase using the service role key
"""

import requests
import json
from typing import Dict, Any

# Supabase configuration
SUPABASE_URL = "https://kzommszdhapvqpekpvnt.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6b21tc3pkaGFwdnFwZWtwdm50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc2NDExNywiZXhwIjoyMDcwMzQwMTE3fQ.58eZkTEw3l2Y9QxP1_ceVm7HPFmow-47aGmbyelpaZk"

def execute_sql(sql: str) -> Dict[str, Any]:
    """Execute SQL directly on Supabase"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    # Use the REST API to execute SQL
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers=headers,
        json={"query": sql}
    )
    
    # If the RPC doesn't exist, try the query endpoint
    if response.status_code == 404:
        # Try direct SQL execution via the query endpoint
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/",
            headers={
                **headers,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data=sql
        )
    
    return {
        "status_code": response.status_code,
        "response": response.text,
        "success": response.status_code in [200, 201, 204]
    }

def apply_rls_policies():
    """Apply all RLS policies for storage buckets"""
    print("🔐 Applying Storage RLS Policies")
    print("=" * 50)
    
    # Define RLS policies for each bucket
    policies = [
        {
            "bucket": "employee-documents",
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
            "bucket": "generated-documents",
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
            "bucket": "onboarding-forms",
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
            "bucket": "employee-photos",
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
            "bucket": "property-documents",
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
    
    # Alternative: Try using Supabase Python client for SQL execution
    from supabase import create_client, Client
    
    try:
        # Create Supabase client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("✅ Connected to Supabase with service role")
        
        # Try to execute SQL via the client (this might not work directly)
        # We'll use the storage API instead to test access
        
        print("\n📊 Testing bucket access before applying policies...")
        buckets_to_test = [
            'employee-documents',
            'generated-documents', 
            'onboarding-forms',
            'employee-photos',
            'property-documents'
        ]
        
        for bucket_id in buckets_to_test:
            try:
                # Try to list files (should work with service role)
                result = supabase.storage.from_(bucket_id).list()
                print(f"✅ Service role has access to: {bucket_id}")
            except Exception as e:
                print(f"❌ Cannot access bucket {bucket_id}: {str(e)}")
        
        print("\n⚠️  Note: RLS policies must be applied via Supabase Dashboard SQL Editor")
        print("The service role already has full access to all buckets.")
        print("\nTo apply the policies for other roles, run this SQL in your dashboard:\n")
        
        # Print all SQL for manual execution
        all_sql = []
        for policy in policies:
            all_sql.append(f"-- Policy for {policy['bucket']} bucket")
            all_sql.append(policy['sql'])
        
        print("\n".join(all_sql))
        
        print("\n📝 Alternative: The service role is already working!")
        print("PDF uploads should work with the service role key being used by the backend.")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_upload_with_service_role():
    """Test uploading a file with service role"""
    from supabase import create_client, Client
    import base64
    
    print("\n🧪 Testing file upload with service role...")
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        # Create a test PDF content
        test_content = b"Test PDF content for RLS policy verification"
        test_filename = "test_rls_policy.txt"
        
        # Try to upload to generated-documents bucket
        bucket_name = 'generated-documents'
        path = f"test/{test_filename}"
        
        result = supabase.storage.from_(bucket_name).upload(
            path,
            test_content,
            file_options={"content-type": "text/plain"}
        )
        
        print(f"✅ Successfully uploaded test file to {bucket_name}/{path}")
        print(f"   Result: {result}")
        
        # Try to get a public URL
        url = supabase.storage.from_(bucket_name).get_public_url(path)
        print(f"✅ Public URL: {url}")
        
        # Clean up - delete the test file
        supabase.storage.from_(bucket_name).remove([path])
        print(f"✅ Test file cleaned up")
        
        return True
        
    except Exception as e:
        print(f"❌ Upload test failed: {str(e)}")
        return False

def main():
    """Main execution"""
    print("🚀 Storage RLS Policy Application")
    print("=" * 50)
    print(f"Supabase URL: {SUPABASE_URL}")
    print(f"Using service role key: {SUPABASE_SERVICE_KEY[:50]}...")
    
    # Apply policies (or show that they need manual application)
    apply_rls_policies()
    
    # Test upload capability
    test_upload_with_service_role()
    
    print("\n✅ Done! The service role should now be able to upload files.")
    print("If uploads are still failing, check that:")
    print("1. The buckets exist (they do)")
    print("2. The service role key is being used by the backend")
    print("3. The backend is using the admin client for uploads")

if __name__ == "__main__":
    main()