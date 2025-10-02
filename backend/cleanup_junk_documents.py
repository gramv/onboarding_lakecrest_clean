#!/usr/bin/env python3
"""
Clean up junk/test documents from Supabase storage
Only keep properly signed documents
"""

import os
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://kzommszdhapvqpekpvnt.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6b21tc3pkaGFwdnFwZWtwdm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzM4MDAsImV4cCI6MjA2OTI0OTgwMH0.I_qsO9Y7iqtP-YW9vhyp3OOxsLCBZ_13feCfV-5zUMI")

def cleanup_junk_documents():
    """Remove test and unsigned documents from storage"""
    
    print("🧹 Starting cleanup of junk documents...")
    
    # Initialize Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    try:
        # Get all documents from documents table
        documents = supabase.table('documents').select('*').execute()
        
        if not documents.data:
            print("No documents found in database")
            return
        
        deleted_count = 0
        kept_count = 0
        
        for doc in documents.data:
            filename = doc.get('filename', '')
            metadata = doc.get('metadata', {})
            
            # Identify junk documents to delete
            should_delete = False
            reason = ""
            
            # Delete test documents
            if 'test' in filename.lower():
                should_delete = True
                reason = "Test document"
            
            # Delete documents without signatures
            elif not metadata.get('signature_id') and not metadata.get('signed'):
                should_delete = True
                reason = "Unsigned document"
            
            # Delete documents from test endpoints
            elif metadata.get('test_generation'):
                should_delete = True
                reason = "Generated from test endpoint"
            
            # Delete preview-only documents (not final signed versions)
            elif 'preview' in filename.lower() or 'temp' in filename.lower():
                should_delete = True
                reason = "Preview/temporary document"
            
            if should_delete:
                # Delete from storage
                try:
                    # Delete from storage bucket if path exists
                    if doc.get('storage_path'):
                        storage_response = supabase.storage.from_('documents').remove([doc['storage_path']])
                        
                    # Delete from database
                    delete_response = supabase.table('documents').delete().eq('id', doc['id']).execute()
                    
                    print(f"❌ Deleted: {filename} - Reason: {reason}")
                    deleted_count += 1
                except Exception as e:
                    print(f"⚠️ Failed to delete {filename}: {e}")
            else:
                print(f"✅ Kept: {filename} - Signed document")
                kept_count += 1
        
        print(f"\n📊 Cleanup Summary:")
        print(f"   Deleted: {deleted_count} junk documents")
        print(f"   Kept: {kept_count} signed documents")
        
        # Also clean up orphaned records in onboarding_form_data that aren't signed
        print("\n🧹 Cleaning orphaned form data...")
        
        # Get form data records
        form_data = supabase.table('onboarding_form_data').select('*').execute()
        
        orphan_count = 0
        for record in form_data.data:
            step_id = record.get('step_id', '')
            step_data = record.get('step_data', {})
            
            # Check if it's a document step that should have been signed
            if step_id in ['company-policies', 'i9-complete', 'w4']:
                # Check if it has signature data
                if isinstance(step_data, dict):
                    if not step_data.get('isSigned') and not step_data.get('signatureData'):
                        # This is an incomplete document step - can be cleaned
                        try:
                            delete_response = supabase.table('onboarding_form_data').delete().eq('id', record['id']).execute()
                            print(f"❌ Deleted orphaned {step_id} record")
                            orphan_count += 1
                        except Exception as e:
                            print(f"⚠️ Failed to delete orphaned record: {e}")
        
        print(f"   Deleted: {orphan_count} orphaned form records")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n✨ Cleanup complete!")

if __name__ == "__main__":
    cleanup_junk_documents()