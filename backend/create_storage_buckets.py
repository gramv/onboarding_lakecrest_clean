#!/usr/bin/env python3
"""
Create Supabase storage buckets for the hotel onboarding system.
Run this script once to set up all required storage buckets.
"""

import os
import sys
from supabase import create_client, Client
from typing import Dict, List, Any
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Get Supabase credentials from environment or use defaults
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://kzommszdhapvqpekpvnt.supabase.co')
# Using service role key for bucket creation (has admin permissions)
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6b21tc3pkaGFwdnFwZWtwdm50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc2NDExNywiZXhwIjoyMDcwMzQwMTE3fQ.58eZkTEw3l2Y9QxP1_ceVm7HPFmow-47aGmbyelpaZk')

def create_storage_buckets(client: Client) -> Dict[str, bool]:
    """
    Create all required storage buckets for the onboarding system.
    
    Returns:
        Dict mapping bucket names to creation success status
    """
    results = {}
    
    # Define bucket configurations
    buckets = [
        {
            "id": "employee-documents",
            "name": "Employee Documents",
            "public": False,
            "file_size_limit": 10485760,  # 10MB
            "allowed_mime_types": [
                "image/jpeg", 
                "image/jpg",
                "image/png", 
                "image/gif",
                "application/pdf"
            ]
        },
        {
            "id": "generated-documents",
            "name": "Generated Documents",
            "public": False,
            "file_size_limit": 10485760,  # 10MB
            "allowed_mime_types": ["application/pdf"]
        },
        {
            "id": "onboarding-forms",
            "name": "Onboarding Forms",
            "public": False,
            "file_size_limit": 5242880,  # 5MB
            "allowed_mime_types": ["application/pdf"]
        },
        {
            "id": "employee-photos",
            "name": "Employee Photos",
            "public": False,
            "file_size_limit": 2097152,  # 2MB
            "allowed_mime_types": [
                "image/jpeg",
                "image/jpg",
                "image/png",
                "image/gif",
                "image/webp"
            ]
        },
        {
            "id": "property-documents",
            "name": "Property Documents",
            "public": False,
            "file_size_limit": 20971520,  # 20MB
            "allowed_mime_types": [
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ]
        }
    ]
    
    for bucket_config in buckets:
        bucket_id = bucket_config["id"]
        try:
            # Check if bucket already exists
            existing_buckets = client.storage.list_buckets()
            # Buckets are SyncBucket dataclass objects
            bucket_exists = any(b.id == bucket_id for b in existing_buckets)
            
            if bucket_exists:
                logger.info(f"Bucket '{bucket_id}' already exists - skipping creation")
                results[bucket_id] = True
                continue
            
            # Create the bucket
            result = client.storage.create_bucket(
                bucket_id,
                options={
                    "public": bucket_config["public"],
                    "fileSizeLimit": bucket_config["file_size_limit"],
                    "allowedMimeTypes": bucket_config["allowed_mime_types"]
                }
            )
            
            logger.info(f"✅ Successfully created bucket: {bucket_id}")
            results[bucket_id] = True
            
        except Exception as e:
            logger.error(f"❌ Failed to create bucket '{bucket_id}': {str(e)}")
            results[bucket_id] = False
    
    return results

def setup_bucket_policies(client: Client) -> None:
    """
    Set up storage policies for the buckets.
    Note: RLS policies need to be configured in Supabase dashboard
    or via SQL migrations for fine-grained access control.
    """
    logger.info("\n📋 Bucket Access Policy Guidelines:")
    logger.info("=" * 50)
    
    policies = {
        "employee-documents": {
            "description": "Sensitive employee documents (DL, SSN, etc.)",
            "access": [
                "• HR users: Full access to all documents",
                "• Managers: Access limited to their property's employees",
                "• Employees: Temporary access via signed URLs during onboarding"
            ]
        },
        "generated-documents": {
            "description": "System-generated PDFs (W-4, I-9, Direct Deposit, etc.)",
            "access": [
                "• System: Write access for PDF generation",
                "• HR users: Full read access to all documents",
                "• Managers: Read access limited to their property's documents",
                "• Employees: Temporary access via signed URLs"
            ]
        },
        "onboarding-forms": {
            "description": "Generated and signed PDF forms",
            "access": [
                "• HR users: Full access to all forms",
                "• Managers: Access limited to their property's forms",
                "• Employees: Temporary access via signed URLs"
            ]
        },
        "employee-photos": {
            "description": "Employee profile and ID photos",
            "access": [
                "• HR users: Full access",
                "• Managers: Access limited to their property",
                "• Employees: Can upload during onboarding"
            ]
        },
        "property-documents": {
            "description": "Property-specific policies and handbooks",
            "access": [
                "• HR users: Full access",
                "• Managers: Access limited to their property",
                "• Employees: Read-only via signed URLs"
            ]
        }
    }
    
    for bucket, policy in policies.items():
        logger.info(f"\n📁 {bucket}")
        logger.info(f"   {policy['description']}")
        logger.info("   Access Control:")
        for access_rule in policy['access']:
            logger.info(f"   {access_rule}")

def verify_bucket_setup(client: Client) -> None:
    """Verify that all buckets were created successfully."""
    try:
        buckets = client.storage.list_buckets()
        required_buckets = [
            "employee-documents",
            "generated-documents",
            "onboarding-forms", 
            "employee-photos",
            "property-documents"
        ]
        
        logger.info("\n✅ Bucket Verification:")
        logger.info("=" * 50)
        
        for required in required_buckets:
            # Buckets are SyncBucket dataclass objects
            exists = any(b.id == required for b in buckets)
            status = "✓" if exists else "✗"
            logger.info(f"{status} {required}")
        
        # Display bucket details
        logger.info("\n📊 Bucket Details:")
        for bucket in buckets:
            if bucket.id in required_buckets:
                logger.info(f"\n{bucket.id}:")
                logger.info(f"  - Name: {bucket.name}")
                logger.info(f"  - Public: {bucket.public}")
                logger.info(f"  - Created: {bucket.created_at}")
                
    except Exception as e:
        logger.error(f"Failed to verify buckets: {str(e)}")

def main():
    """Main execution function."""
    logger.info("🚀 Supabase Storage Bucket Setup")
    logger.info("=" * 50)
    logger.info(f"URL: {SUPABASE_URL}")
    logger.info(f"Using anon key: {SUPABASE_KEY[:20]}...")
    
    try:
        # Create Supabase client
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("\n✅ Connected to Supabase successfully")
        
        # Create storage buckets
        logger.info("\n📦 Creating storage buckets...")
        results = create_storage_buckets(client)
        
        # Display results
        success_count = sum(1 for v in results.values() if v)
        logger.info(f"\n📊 Results: {success_count}/{len(results)} buckets created/verified")
        
        # Set up policies (informational)
        setup_bucket_policies(client)
        
        # Verify setup
        verify_bucket_setup(client)
        
        logger.info("\n✅ Storage bucket setup complete!")
        logger.info("\n⚠️  Important Next Steps:")
        logger.info("1. Configure RLS policies in Supabase dashboard if needed")
        logger.info("2. Set up CORS for your frontend domain")
        logger.info("3. Monitor storage usage in the dashboard")
        
        return 0
        
    except Exception as e:
        logger.error(f"\n❌ Setup failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())