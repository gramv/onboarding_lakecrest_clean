"""
ID Document Retriever Service
Retrieves and decrypts uploaded ID documents from Supabase storage
"""

import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


# Document type to I-9 list category mapping
DOCUMENT_TYPE_LABELS = {
    'drivers_license': ('Driver\'s License', 'List B'),
    'state_id': ('State ID Card', 'List B'),
    'passport': ('U.S. Passport', 'List A'),
    'us_passport': ('U.S. Passport', 'List A'),
    'passport_card': ('Passport Card', 'List A'),
    'permanent_resident_card': ('Permanent Resident Card', 'List A'),
    'green_card': ('Permanent Resident Card', 'List A'),
    'employment_authorization': ('Employment Authorization Document', 'List A'),
    'ead': ('Employment Authorization Document', 'List A'),
    'social_security_card': ('Social Security Card', 'List C'),
    'ssn_card': ('Social Security Card', 'List C'),
    'birth_certificate': ('U.S. Birth Certificate', 'List C'),
    'other': ('Other Document', 'List B')
}


class IDDocumentRetriever:
    """Retrieve and decrypt uploaded ID documents for PDF inclusion"""
    
    def _normalize_storage_list(self, bucket: str, path: str, response: Any) -> List[Dict[str, Any]]:
        """Normalize Supabase storage list responses"""
        if isinstance(response, dict):
            error = response.get('error')
            if error:
                logger.warning(f"Storage list error for {bucket}/{path}: {error}")
                return []
            data = response.get('data')
            return data or []
        return response or []
    
    def _entry_name(self, entry: Any) -> Optional[str]:
        """Extract name from storage entry"""
        if isinstance(entry, dict):
            return entry.get('name')
        if hasattr(entry, 'name'):
            return entry.name
        return None
    
    def _is_directory(self, entry: Any) -> bool:
        """Check if storage entry is a directory"""
        if isinstance(entry, dict):
            return entry.get('id') is None
        return False
    
    async def get_employee_id_documents(
        self, 
        employee_id: str,
        supabase_service
    ) -> List[Dict[str, Any]]:
        """
        Retrieve all I-9 verification uploads for an employee
        
        Args:
            employee_id: Employee UUID
            supabase_service: EnhancedSupabaseService instance
            
        Returns:
            List of documents with structure:
            {
                'document_type': 'drivers_license',
                'file_name': 'license.jpg',
                'file_bytes': b'...',  # Decrypted
                'mime_type': 'image/jpeg',
                'list_category': 'List B',
                'display_name': 'Driver\'s License'
            }
        """
        try:
            # Import path manager
            from ..document_path_utils import document_path_manager
            
            # Get employee's property_id
            employee = await supabase_service.get_employee_by_id(employee_id)
            if not employee:
                logger.warning(f"[ID-DOCS] Employee {employee_id} not found")
                return []
            
            property_id = employee.get('property_id') if isinstance(employee, dict) else getattr(employee, 'property_id', None)
            
            if not property_id:
                logger.warning(f"[ID-DOCS] No property_id for employee {employee_id}")
                return []
            
            # Build storage path
            property_name = await document_path_manager.get_property_name(property_id)
            employee_folder = await document_path_manager.get_employee_folder_name(employee_id, property_id)
            
            bucket_name = 'onboarding-documents'
            base_path = f"{property_name}/{employee_folder}/uploads/i9_verification"
            
            logger.info(f"[ID-DOCS] Looking for documents in: {bucket_name}/{base_path}")
            
            storage_accessor = supabase_service.admin_client
            
            # List all subfolders (document types)
            try:
                folders = storage_accessor.storage.from_(bucket_name).list(base_path)
                folders = self._normalize_storage_list(bucket_name, base_path, folders)
            except Exception as list_err:
                logger.warning(f"[ID-DOCS] Failed to list folders in {base_path}: {list_err}")
                return []
            
            if not folders:
                logger.info(f"[ID-DOCS] No uploaded ID documents found for employee {employee_id}")
                return []
            
            logger.info(f"[ID-DOCS] Found {len(folders)} document folders")
            
            # Collect all documents
            documents = []
            
            for folder in folders:
                folder_name = self._entry_name(folder)
                if not folder_name or not self._is_directory(folder):
                    continue
                
                folder_path = f"{base_path}/{folder_name}"
                logger.info(f"[ID-DOCS] Checking folder: {folder_path}")
                
                # List files in this folder
                try:
                    files = storage_accessor.storage.from_(bucket_name).list(folder_path)
                    files = self._normalize_storage_list(bucket_name, folder_path, files)
                except Exception as file_err:
                    logger.warning(f"[ID-DOCS] Failed to list files in {folder_path}: {file_err}")
                    continue
                
                # Process each file
                for file in files:
                    file_name = self._entry_name(file)
                    if not file_name:
                        continue
                    
                    # Skip if directory
                    if self._is_directory(file):
                        continue
                    
                    # Only process image and PDF files
                    if not file_name.lower().endswith(('.jpg', '.jpeg', '.png', '.pdf')):
                        logger.info(f"[ID-DOCS] Skipping non-document file: {file_name}")
                        continue
                    
                    file_path_full = f"{folder_path}/{file_name}"
                    
                    try:
                        # Download encrypted document
                        logger.info(f"[ID-DOCS] Downloading: {file_path_full}")
                        raw_bytes = storage_accessor.storage.from_(bucket_name).download(file_path_full)
                        
                        # Decrypt the document
                        logger.info(f"[ID-DOCS] Decrypting: {file_name}")
                        decrypted_bytes, was_encrypted = supabase_service.doc_encryption.decrypt_document(
                            raw_bytes,
                            document_type=f"i9_upload_{folder_name}",
                            employee_id=employee_id
                        )
                        
                        if was_encrypted:
                            logger.info(f"[ID-DOCS] ✅ Decrypted {file_name}: {len(raw_bytes)} → {len(decrypted_bytes)} bytes")
                        else:
                            logger.warning(f"[ID-DOCS] ⚠️  Unencrypted document: {file_name}")
                        
                        # Determine MIME type
                        mime_type = 'application/pdf' if file_name.lower().endswith('.pdf') else 'image/jpeg'
                        
                        # Get display name and list category
                        display_name, list_category = DOCUMENT_TYPE_LABELS.get(
                            folder_name.lower(), 
                            (folder_name.replace('_', ' ').title(), 'List B')
                        )
                        
                        # Add to documents list
                        documents.append({
                            'document_type': folder_name,
                            'file_name': file_name,
                            'file_bytes': decrypted_bytes,
                            'mime_type': mime_type,
                            'list_category': list_category,
                            'display_name': display_name
                        })
                        
                        logger.info(f"[ID-DOCS] ✅ Added document: {display_name} ({file_name})")
                        
                    except Exception as doc_err:
                        logger.error(f"[ID-DOCS] ❌ Failed to process {file_path_full}: {doc_err}")
                        # Continue processing other documents
                        continue
            
            logger.info(f"[ID-DOCS] ✅ Retrieved {len(documents)} ID documents total")
            return documents
            
        except Exception as e:
            logger.error(f"[ID-DOCS] ❌ Failed to retrieve ID documents for {employee_id}: {e}")
            return []


__all__ = ['IDDocumentRetriever', 'DOCUMENT_TYPE_LABELS']

