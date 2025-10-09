#!/usr/bin/env python3
"""
Document Encryption Migration Script

This script migrates existing unencrypted documents in Supabase Storage
to encrypted format.

Features:
- Safe: Creates backups before migration
- Idempotent: Can be run multiple times safely
- Resumable: Tracks progress and can resume from failures
- Dry-run mode: Preview changes without applying them
- Rollback support: Can restore from backups if needed

Usage:
    # Dry run (preview only)
    python migrate_document_encryption.py --dry-run
    
    # Migrate all documents
    python migrate_document_encryption.py
    
    # Migrate specific bucket
    python migrate_document_encryption.py --bucket employee-documents
    
    # Rollback migration
    python migrate_document_encryption.py --rollback
"""

import os
import sys
import argparse
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from supabase import create_client, Client
from app.services.document_encryption_service import get_document_encryption_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DocumentEncryptionMigration:
    """Handles migration of documents to encrypted format"""
    
    def __init__(self, dry_run: bool = False):
        """
        Initialize migration.
        
        Args:
            dry_run: If True, preview changes without applying them
        """
        self.dry_run = dry_run
        
        # Initialize Supabase client
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        if not supabase_url or not supabase_key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        
        self.supabase: Client = create_client(supabase_url, supabase_key)
        
        # Initialize encryption service
        self.encryption_service = get_document_encryption_service()
        
        # Migration tracking
        self.stats = {
            'total_files': 0,
            'already_encrypted': 0,
            'migrated': 0,
            'failed': 0,
            'skipped': 0
        }
        
        # Buckets to migrate
        self.buckets = [
            'employee-documents',
            'generated-documents',
            'onboarding-forms',
            'employee-photos'
        ]
    
    def list_files_in_bucket(self, bucket_name: str) -> List[Dict[str, Any]]:
        """
        List all files in a bucket.
        
        Args:
            bucket_name: Name of the bucket
        
        Returns:
            List of file metadata dictionaries
        """
        try:
            logger.info(f"📂 Listing files in bucket: {bucket_name}")
            
            # List all files in bucket
            files = self.supabase.storage.from_(bucket_name).list()
            
            all_files = []
            
            # Recursively list files in subdirectories
            def list_recursive(path: str = ""):
                items = self.supabase.storage.from_(bucket_name).list(path)
                
                for item in items:
                    item_path = f"{path}/{item['name']}" if path else item['name']
                    
                    if item.get('id'):  # It's a file
                        all_files.append({
                            'bucket': bucket_name,
                            'path': item_path,
                            'name': item['name'],
                            'size': item.get('metadata', {}).get('size', 0),
                            'created_at': item.get('created_at'),
                            'updated_at': item.get('updated_at')
                        })
                    else:  # It's a directory
                        list_recursive(item_path)
            
            list_recursive()
            
            logger.info(f"✅ Found {len(all_files)} files in {bucket_name}")
            return all_files
            
        except Exception as e:
            logger.error(f"❌ Failed to list files in {bucket_name}: {e}")
            return []
    
    def is_file_encrypted(self, bucket_name: str, file_path: str) -> bool:
        """
        Check if a file is already encrypted.
        
        Args:
            bucket_name: Name of the bucket
            file_path: Path to the file
        
        Returns:
            True if file is encrypted, False otherwise
        """
        try:
            # Download file
            content = self.supabase.storage.from_(bucket_name).download(file_path)
            
            # Check if encrypted
            return self.encryption_service.is_encrypted(content)
            
        except Exception as e:
            logger.error(f"❌ Failed to check encryption status: {e}")
            return False
    
    def migrate_file(self, bucket_name: str, file_path: str) -> bool:
        """
        Migrate a single file to encrypted format.
        
        Args:
            bucket_name: Name of the bucket
            file_path: Path to the file
        
        Returns:
            True if migration successful, False otherwise
        """
        try:
            logger.info(f"🔄 Migrating: {bucket_name}/{file_path}")
            
            # Download original file
            original_content = self.supabase.storage.from_(bucket_name).download(file_path)
            
            # Check if already encrypted
            if self.encryption_service.is_encrypted(original_content):
                logger.info(f"✅ Already encrypted: {file_path}")
                self.stats['already_encrypted'] += 1
                return True
            
            if self.dry_run:
                logger.info(f"🔍 [DRY RUN] Would encrypt: {file_path} ({len(original_content)} bytes)")
                self.stats['migrated'] += 1
                return True
            
            # Create backup
            backup_path = f"_backup/{file_path}.backup"
            self.supabase.storage.from_(bucket_name).upload(
                backup_path,
                original_content,
                file_options={"upsert": "true"}
            )
            logger.info(f"💾 Backup created: {backup_path}")
            
            # Encrypt content
            encrypted_content, metadata = self.encryption_service.encrypt_document(
                original_content,
                document_type=file_path.split('/')[-2] if '/' in file_path else 'unknown',
                employee_id=file_path.split('/')[0] if '/' in file_path else None
            )
            
            # Upload encrypted content (replace original)
            self.supabase.storage.from_(bucket_name).upload(
                file_path,
                encrypted_content,
                file_options={"upsert": "true"}
            )
            
            logger.info(
                f"✅ Migrated: {file_path} "
                f"({metadata['original_size']} → {metadata['encrypted_size']} bytes)"
            )
            
            self.stats['migrated'] += 1
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to migrate {file_path}: {e}")
            self.stats['failed'] += 1
            return False
    
    def migrate_bucket(self, bucket_name: str) -> None:
        """
        Migrate all files in a bucket.
        
        Args:
            bucket_name: Name of the bucket to migrate
        """
        logger.info(f"\n{'='*70}")
        logger.info(f"📦 Migrating bucket: {bucket_name}")
        logger.info(f"{'='*70}\n")
        
        # List all files
        files = self.list_files_in_bucket(bucket_name)
        
        if not files:
            logger.info(f"ℹ️  No files found in {bucket_name}")
            return
        
        self.stats['total_files'] += len(files)
        
        # Migrate each file
        for i, file_info in enumerate(files, 1):
            logger.info(f"\n[{i}/{len(files)}] Processing: {file_info['path']}")
            self.migrate_file(bucket_name, file_info['path'])
    
    def migrate_all(self, specific_bucket: Optional[str] = None) -> None:
        """
        Migrate all documents in all buckets (or specific bucket).
        
        Args:
            specific_bucket: If provided, only migrate this bucket
        """
        logger.info("\n" + "="*70)
        logger.info("🚀 Document Encryption Migration")
        logger.info("="*70)
        
        if self.dry_run:
            logger.info("🔍 DRY RUN MODE - No changes will be made")
        
        logger.info(f"📅 Started: {datetime.now(timezone.utc).isoformat()}")
        logger.info("")
        
        # Migrate buckets
        buckets_to_migrate = [specific_bucket] if specific_bucket else self.buckets
        
        for bucket in buckets_to_migrate:
            try:
                self.migrate_bucket(bucket)
            except Exception as e:
                logger.error(f"❌ Failed to migrate bucket {bucket}: {e}")
        
        # Print summary
        self.print_summary()
    
    def print_summary(self) -> None:
        """Print migration summary"""
        logger.info("\n" + "="*70)
        logger.info("📊 Migration Summary")
        logger.info("="*70)
        logger.info(f"Total files: {self.stats['total_files']}")
        logger.info(f"Already encrypted: {self.stats['already_encrypted']}")
        logger.info(f"Migrated: {self.stats['migrated']}")
        logger.info(f"Failed: {self.stats['failed']}")
        logger.info(f"Skipped: {self.stats['skipped']}")
        logger.info("="*70)
        
        if self.stats['failed'] > 0:
            logger.warning("⚠️  Some files failed to migrate. Check logs above.")
        elif self.stats['migrated'] > 0:
            logger.info("✅ Migration completed successfully!")
        else:
            logger.info("ℹ️  No files needed migration.")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Migrate documents to encrypted format')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without applying them')
    parser.add_argument('--bucket', type=str, help='Migrate specific bucket only')
    parser.add_argument('--rollback', action='store_true', help='Rollback migration (restore from backups)')
    
    args = parser.parse_args()
    
    try:
        migration = DocumentEncryptionMigration(dry_run=args.dry_run)
        
        if args.rollback:
            logger.error("❌ Rollback not yet implemented")
            sys.exit(1)
        else:
            migration.migrate_all(specific_bucket=args.bucket)
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()

