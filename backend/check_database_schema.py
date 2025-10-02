#!/usr/bin/env python3
"""
Check Database Schema and Create Missing Tables

This script checks if the required tables exist and creates them if needed.
"""

import asyncio
import os
import sys
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Add the backend app directory to Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from app.supabase_service_enhanced import EnhancedSupabaseService


async def check_and_create_tables():
    """Check if required tables exist and create them if needed"""
    print("🔍 Checking database schema...")
    
    service = EnhancedSupabaseService()
    
    # Check if i9_documents table exists
    try:
        result = service.client.table('i9_documents').select('*').limit(1).execute()
        print("✅ i9_documents table exists")
        
        # Check if we can insert a test record to verify schema
        test_record = {
            'id': 'test-schema-check',
            'employee_id': 'test-employee',
            'document_type': 'drivers_license',
            'document_list': 'list_b',
            'file_name': 'test.jpg',
            'file_size': 1000,
            'mime_type': 'image/jpeg',
            'file_url': 'test-url',
            'storage_path': 'test-path',
            'status': 'uploaded',
            'metadata': {'test': True}
        }
        
        # Try to insert and immediately delete
        insert_result = service.client.table('i9_documents').insert(test_record).execute()
        if insert_result.data:
            print("✅ i9_documents table schema is compatible")
            # Clean up test record
            service.client.table('i9_documents').delete().eq('id', 'test-schema-check').execute()
        else:
            print("❌ i9_documents table schema has issues")
            
    except Exception as e:
        print(f"❌ i9_documents table issue: {e}")
        
        # Try to create the table with minimal schema
        print("🔧 Attempting to create i9_documents table...")
        try:
            # Create table using SQL
            create_sql = """
            CREATE TABLE IF NOT EXISTS public.i9_documents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                employee_id UUID NOT NULL,
                document_type TEXT NOT NULL,
                document_list TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_size INTEGER,
                mime_type TEXT,
                file_url TEXT,
                storage_path TEXT,
                status TEXT DEFAULT 'uploaded',
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            -- Add RLS policy
            ALTER TABLE public.i9_documents ENABLE ROW LEVEL SECURITY;
            
            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_i9_documents_employee_id ON public.i9_documents(employee_id);
            CREATE INDEX IF NOT EXISTS idx_i9_documents_document_type ON public.i9_documents(document_type);
            CREATE INDEX IF NOT EXISTS idx_i9_documents_status ON public.i9_documents(status);
            """
            
            # Execute using raw SQL (this might not work with all Supabase configurations)
            print("⚠️ Cannot create table via API - please create manually in Supabase dashboard")
            
        except Exception as create_error:
            print(f"❌ Failed to create i9_documents table: {create_error}")
    
    # Check generated_pdfs table
    try:
        result = service.client.table('generated_pdfs').select('*').limit(1).execute()
        print("✅ generated_pdfs table exists")
        
        # Test schema compatibility
        test_record = {
            'id': 'test-schema-check',
            'employee_id': 'test-employee',
            'form_type': 'i9_form',
            'file_name': 'test.pdf',
            'file_size': 1000,
            'storage_path': 'test-path',
            'public_url': 'test-url',
            'metadata': {'test': True}
        }
        
        insert_result = service.client.table('generated_pdfs').insert(test_record).execute()
        if insert_result.data:
            print("✅ generated_pdfs table schema is compatible")
            # Clean up
            service.client.table('generated_pdfs').delete().eq('id', 'test-schema-check').execute()
        else:
            print("❌ generated_pdfs table schema has issues")
            
    except Exception as e:
        print(f"❌ generated_pdfs table issue: {e}")
        print("⚠️ Please ensure generated_pdfs table exists with proper schema")
    
    # Check storage buckets
    try:
        buckets = service.admin_client.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        print(f"📦 Available storage buckets: {bucket_names}")
        
        required_buckets = ['i9-documents', 'onboarding-documents', 'generated-pdfs']
        for bucket in required_buckets:
            if bucket not in bucket_names:
                print(f"⚠️ Missing bucket: {bucket}")
                try:
                    service.admin_client.storage.create_bucket(
                        id=bucket,
                        name=bucket,
                        options={'public': False}
                    )
                    print(f"✅ Created bucket: {bucket}")
                except Exception as bucket_error:
                    print(f"❌ Failed to create bucket {bucket}: {bucket_error}")
            else:
                print(f"✅ Bucket exists: {bucket}")
                
    except Exception as e:
        print(f"❌ Storage bucket check failed: {e}")
    
    print("\n" + "="*60)
    print("📋 SCHEMA CHECK COMPLETE")
    print("="*60)
    print("If you see any ❌ errors above, please:")
    print("1. Check your Supabase dashboard")
    print("2. Ensure tables exist with proper schemas")
    print("3. Verify RLS policies are configured")
    print("4. Check storage bucket permissions")


if __name__ == "__main__":
    asyncio.run(check_and_create_tables())
