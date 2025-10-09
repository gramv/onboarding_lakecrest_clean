"""
Document Encryption Service
Provides encryption/decryption for documents stored in Supabase Storage

Features:
- Encrypts documents before upload to storage
- Decrypts documents after download from storage
- Lazy migration support (handles both encrypted and unencrypted documents)
- Uses Fernet (AES-128-CBC) for file encryption
- Metadata tracking for encryption status
"""

import os
import logging
from typing import Optional, Tuple, Dict, Any
from datetime import datetime, timezone
from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger(__name__)


class DocumentEncryptionService:
    """Service for encrypting/decrypting documents at rest"""
    
    def __init__(self):
        """
        Initialize document encryption service with key from environment.
        
        Environment Variables:
            DOCUMENT_ENCRYPTION_KEY: Base64-encoded Fernet key
            (Falls back to FIELD_ENCRYPTION_KEY if not set)
        
        Raises:
            RuntimeError: If encryption key is not set or invalid
        """
        # Try DOCUMENT_ENCRYPTION_KEY first, fall back to FIELD_ENCRYPTION_KEY
        key = os.getenv('DOCUMENT_ENCRYPTION_KEY') or os.getenv('FIELD_ENCRYPTION_KEY')
        
        if not key:
            error_msg = (
                "❌ DOCUMENT_ENCRYPTION_KEY not set - CANNOT START!\n"
                "   This is REQUIRED for encrypting documents at rest.\n"
                "   \n"
                "   To generate a secure key:\n"
                "   python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'\n"
                "   \n"
                "   Then add to your .env file:\n"
                "   DOCUMENT_ENCRYPTION_KEY=<your-generated-key>\n"
                "   \n"
                "   Or use the same key as field encryption:\n"
                "   DOCUMENT_ENCRYPTION_KEY=$FIELD_ENCRYPTION_KEY\n"
                "   \n"
                "   ⚠️  IMPORTANT: Backup this key securely! Loss = data loss!"
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        try:
            self.cipher = Fernet(key.encode())
            self.enabled = True
            logger.info("✅ Document encryption enabled (Fernet/AES-128)")
        except Exception as e:
            error_msg = (
                f"❌ Failed to initialize document encryption: {e}\n"
                f"   Check DOCUMENT_ENCRYPTION_KEY format\n"
                f"   Key should be a valid Fernet key (base64-encoded)"
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    
    def is_enabled(self) -> bool:
        """Check if document encryption is enabled"""
        return self.enabled
    
    def encrypt_document(
        self,
        file_content: bytes,
        document_type: str = "unknown",
        employee_id: Optional[str] = None
    ) -> Tuple[bytes, Dict[str, Any]]:
        """
        Encrypt document content before storage.
        
        Args:
            file_content: Raw document bytes (PDF, image, etc.)
            document_type: Type of document (for logging)
            employee_id: Employee ID (for logging)
        
        Returns:
            Tuple of (encrypted_content, metadata)
            metadata contains encryption info for tracking
        
        Raises:
            RuntimeError: If encryption fails
        
        Examples:
            >>> service = DocumentEncryptionService()
            >>> encrypted, metadata = service.encrypt_document(pdf_bytes, 'i9_form', 'emp123')
            >>> # Upload encrypted content to storage
        """
        if not file_content:
            raise ValueError("File content is required")
        
        if not self.cipher:
            error_msg = "❌ Document encryption not available - cannot store documents!"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        try:
            # Encrypt the file content
            encrypted_content = self.cipher.encrypt(file_content)
            
            # Create metadata
            metadata = {
                'encrypted': True,
                'encryption_algorithm': 'Fernet/AES-128-CBC',
                'encrypted_at': datetime.now(timezone.utc).isoformat(),
                'original_size': len(file_content),
                'encrypted_size': len(encrypted_content),
                'document_type': document_type,
                'employee_id': employee_id
            }
            
            logger.info(
                f"✅ Document encrypted: {document_type} for {employee_id or 'unknown'} "
                f"({len(file_content)} → {len(encrypted_content)} bytes)"
            )
            
            return encrypted_content, metadata
            
        except Exception as e:
            error_msg = f"❌ Document encryption failed: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    
    def decrypt_document(
        self,
        encrypted_content: bytes,
        document_type: str = "unknown",
        employee_id: Optional[str] = None,
        fallback_to_unencrypted: bool = True
    ) -> Tuple[bytes, bool]:
        """
        Decrypt document content after retrieval from storage.
        
        Supports lazy migration: if decryption fails, assumes document is unencrypted
        and returns it as-is (if fallback_to_unencrypted=True).
        
        Args:
            encrypted_content: Encrypted document bytes from storage
            document_type: Type of document (for logging)
            employee_id: Employee ID (for logging)
            fallback_to_unencrypted: If True, return unencrypted content on decryption failure
        
        Returns:
            Tuple of (decrypted_content, was_encrypted)
            was_encrypted indicates if the document was actually encrypted
        
        Raises:
            RuntimeError: If decryption fails and fallback_to_unencrypted=False
        
        Examples:
            >>> service = DocumentEncryptionService()
            >>> # Download encrypted content from storage
            >>> decrypted, was_encrypted = service.decrypt_document(encrypted_bytes, 'i9_form', 'emp123')
            >>> if was_encrypted:
            >>>     print("Document was encrypted")
            >>> else:
            >>>     print("Document was not encrypted (legacy)")
        """
        if not encrypted_content:
            raise ValueError("Encrypted content is required")
        
        if not self.cipher:
            error_msg = "❌ Document decryption not available!"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        try:
            # Try to decrypt
            decrypted_content = self.cipher.decrypt(encrypted_content)
            
            logger.info(
                f"✅ Document decrypted: {document_type} for {employee_id or 'unknown'} "
                f"({len(encrypted_content)} → {len(decrypted_content)} bytes)"
            )
            
            return decrypted_content, True
            
        except InvalidToken:
            # Decryption failed - likely an unencrypted document (legacy)
            if fallback_to_unencrypted:
                logger.warning(
                    f"⚠️  Document not encrypted (legacy): {document_type} for {employee_id or 'unknown'} "
                    f"- returning as-is"
                )
                return encrypted_content, False
            else:
                error_msg = f"❌ Document decryption failed: Invalid token (not encrypted?)"
                logger.error(error_msg)
                raise RuntimeError(error_msg)
        
        except Exception as e:
            error_msg = f"❌ Document decryption failed: {e}"
            logger.error(error_msg)
            
            if fallback_to_unencrypted:
                logger.warning(f"⚠️  Falling back to unencrypted content")
                return encrypted_content, False
            else:
                raise RuntimeError(error_msg)
    
    def is_encrypted(self, content: bytes) -> bool:
        """
        Check if content appears to be encrypted.
        
        This is a heuristic check - tries to decrypt and returns True if successful.
        
        Args:
            content: Document bytes to check
        
        Returns:
            True if content appears to be encrypted, False otherwise
        """
        if not content or not self.cipher:
            return False
        
        try:
            self.cipher.decrypt(content)
            return True
        except:
            return False
    
    def get_encryption_metadata(self, content: bytes) -> Dict[str, Any]:
        """
        Get metadata about document encryption status.
        
        Args:
            content: Document bytes to analyze
        
        Returns:
            Dictionary with encryption metadata
        """
        is_encrypted = self.is_encrypted(content)
        
        return {
            'encrypted': is_encrypted,
            'size': len(content),
            'algorithm': 'Fernet/AES-128-CBC' if is_encrypted else None,
            'checked_at': datetime.now(timezone.utc).isoformat()
        }


# Global instance
_document_encryption_service: Optional[DocumentEncryptionService] = None


def get_document_encryption_service() -> DocumentEncryptionService:
    """
    Get or create document encryption service instance (singleton).
    
    Returns:
        DocumentEncryptionService instance
    
    Raises:
        RuntimeError: If encryption key is not configured
    """
    global _document_encryption_service
    
    if _document_encryption_service is None:
        _document_encryption_service = DocumentEncryptionService()
    
    return _document_encryption_service


# Convenience functions
def encrypt_document(file_content: bytes, document_type: str = "unknown", employee_id: Optional[str] = None) -> Tuple[bytes, Dict[str, Any]]:
    """Convenience function to encrypt a document"""
    service = get_document_encryption_service()
    return service.encrypt_document(file_content, document_type, employee_id)


def decrypt_document(encrypted_content: bytes, document_type: str = "unknown", employee_id: Optional[str] = None) -> Tuple[bytes, bool]:
    """Convenience function to decrypt a document"""
    service = get_document_encryption_service()
    return service.decrypt_document(encrypted_content, document_type, employee_id)


def is_document_encrypted(content: bytes) -> bool:
    """Convenience function to check if document is encrypted"""
    service = get_document_encryption_service()
    return service.is_encrypted(content)

