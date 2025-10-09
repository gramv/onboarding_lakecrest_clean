"""
Field-Level Encryption Service for Sensitive PII

This service provides encryption/decryption for sensitive personally identifiable
information (PII) such as SSN, bank account numbers, and routing numbers.

Uses Fernet (symmetric encryption) which provides:
- AES-128-CBC encryption
- HMAC authentication
- Timestamp verification
- URL-safe base64 encoding

Security Notes:
- Encryption key must be stored securely (environment variable)
- Key should be backed up securely (loss = data loss)
- Key rotation not implemented in this version
- Encrypted data is larger than plaintext (~1.5x)
"""

import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class EncryptionService:
    """Service for encrypting/decrypting sensitive fields"""
    
    def __init__(self):
        """
        Initialize encryption service with key from environment.

        Environment Variables:
            FIELD_ENCRYPTION_KEY: Base64-encoded Fernet key

        Raises:
            RuntimeError: If encryption key is not set or invalid
        """
        # Get encryption key from environment - REQUIRED
        key = os.getenv('FIELD_ENCRYPTION_KEY')

        if not key:
            error_msg = (
                "❌ FIELD_ENCRYPTION_KEY not set - CANNOT START!\n"
                "   This is REQUIRED for storing sensitive data (SSN, bank accounts, etc.)\n"
                "   \n"
                "   To generate a secure key:\n"
                "   python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'\n"
                "   \n"
                "   Then add to your .env file:\n"
                "   FIELD_ENCRYPTION_KEY=<your-generated-key>\n"
                "   \n"
                "   ⚠️  IMPORTANT: Backup this key securely! Loss = data loss!"
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg)

        try:
            from cryptography.fernet import Fernet
            self.cipher = Fernet(key.encode())
            self.enabled = True
            logger.info("✅ Field encryption enabled (Fernet/AES-128)")
        except ImportError:
            error_msg = (
                "❌ cryptography package not installed!\n"
                "   Install with: pip install cryptography"
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        except Exception as e:
            error_msg = (
                f"❌ Failed to initialize encryption: {e}\n"
                f"   Check FIELD_ENCRYPTION_KEY format\n"
                f"   Key should be a valid Fernet key (base64-encoded)"
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    
    def is_enabled(self) -> bool:
        """Check if encryption is enabled"""
        return self.enabled
    
    def encrypt(self, value: Optional[str]) -> Optional[str]:
        """
        Encrypt a string value.

        Args:
            value: Plain text string to encrypt

        Returns:
            Encrypted string (base64 encoded) or None if value is None

        Raises:
            RuntimeError: If encryption is not available or fails

        Examples:
            >>> service = EncryptionService()
            >>> encrypted = service.encrypt("123-45-6789")
            >>> print(encrypted)
            'gAAAAABhX...'  # Fernet encrypted string
        """
        if not value:
            return None

        if not self.cipher:
            error_msg = "❌ Encryption not available - cannot store sensitive data!"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

        try:
            encrypted = self.cipher.encrypt(value.encode())
            logger.debug(f"🔒 Encrypted field (length: {len(value)} → {len(encrypted)})")
            return encrypted.decode()
        except Exception as e:
            error_msg = f"❌ Encryption failed: {e} (value length: {len(value)})"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    
    def decrypt(self, encrypted_value: Optional[str]) -> Optional[str]:
        """
        Decrypt an encrypted string.
        
        Args:
            encrypted_value: Encrypted string (base64 encoded)
        
        Returns:
            Decrypted plain text string or None if encrypted_value is None
            Returns as-is if decryption fails (assumes plain text)
        
        Examples:
            >>> service = EncryptionService()
            >>> decrypted = service.decrypt("gAAAAABhX...")
            >>> print(decrypted)
            '123-45-6789'
        """
        if not encrypted_value:
            return None
        
        if not self.cipher:
            logger.warning("⚠️  Encryption not available - returning as-is")
            return encrypted_value
        
        try:
            decrypted = self.cipher.decrypt(encrypted_value.encode())
            logger.debug(f"🔓 Decrypted field (length: {len(encrypted_value)} → {len(decrypted)})")
            return decrypted.decode()
        except Exception as e:
            # If decryption fails, might be plain text (backwards compatibility)
            logger.warning(f"⚠️  Decryption failed, returning as-is: {e}")
            logger.warning(f"   This might be plain text data from before encryption was enabled")
            return encrypted_value
    
    def is_encrypted(self, value: Optional[str]) -> bool:
        """
        Check if a value appears to be encrypted.
        
        Fernet encrypted strings start with 'gAAAAA' (base64 of version + timestamp)
        
        Args:
            value: String to check
        
        Returns:
            True if value appears to be Fernet encrypted, False otherwise
        """
        if not value:
            return False
        
        # Fernet encrypted strings start with 'gAAAAA'
        return value.startswith('gAAAAA')
    
    def encrypt_if_needed(self, value: Optional[str]) -> Optional[str]:
        """
        Encrypt value only if it's not already encrypted.
        
        Useful for idempotent operations and migrations.
        
        Args:
            value: Plain text or encrypted string
        
        Returns:
            Encrypted string
        """
        if not value:
            return None
        
        if self.is_encrypted(value):
            logger.debug("Value already encrypted, skipping")
            return value
        
        return self.encrypt(value)
    
    def decrypt_if_needed(self, value: Optional[str]) -> Optional[str]:
        """
        Decrypt value only if it appears to be encrypted.
        
        Useful for backwards compatibility with plain text data.
        
        Args:
            value: Encrypted or plain text string
        
        Returns:
            Plain text string
        """
        if not value:
            return None
        
        if not self.is_encrypted(value):
            logger.debug("Value not encrypted, returning as-is")
            return value
        
        return self.decrypt(value)
    
    def encrypt_dict_fields(self, data: dict, fields: list) -> dict:
        """
        Encrypt specific fields in a dictionary.
        
        Args:
            data: Dictionary containing data
            fields: List of field names to encrypt
        
        Returns:
            Dictionary with encrypted fields (original dict is not modified)
        
        Examples:
            >>> service = EncryptionService()
            >>> data = {'name': 'John', 'ssn': '123-45-6789'}
            >>> encrypted = service.encrypt_dict_fields(data, ['ssn'])
            >>> print(encrypted)
            {'name': 'John', 'ssn': 'gAAAAABhX...'}
        """
        result = data.copy()
        
        for field in fields:
            if field in result and result[field]:
                result[field] = self.encrypt(result[field])
        
        return result
    
    def decrypt_dict_fields(self, data: dict, fields: list) -> dict:
        """
        Decrypt specific fields in a dictionary.
        
        Args:
            data: Dictionary containing encrypted data
            fields: List of field names to decrypt
        
        Returns:
            Dictionary with decrypted fields (original dict is not modified)
        """
        result = data.copy()
        
        for field in fields:
            if field in result and result[field]:
                result[field] = self.decrypt(result[field])
        
        return result


# Global instance (singleton)
_encryption_service = None


def get_encryption_service() -> EncryptionService:
    """
    Get or create encryption service instance (singleton pattern).
    
    Returns:
        EncryptionService instance
    """
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
        if _encryption_service.is_enabled():
            logger.info("✅ Encryption service initialized")
        else:
            logger.warning("⚠️  Encryption service initialized but DISABLED")
    return _encryption_service


# Convenience functions
def encrypt_ssn(ssn: Optional[str]) -> Optional[str]:
    """Encrypt a Social Security Number"""
    return get_encryption_service().encrypt(ssn)


def decrypt_ssn(encrypted_ssn: Optional[str]) -> Optional[str]:
    """Decrypt a Social Security Number"""
    return get_encryption_service().decrypt(encrypted_ssn)


def encrypt_bank_account(account: Optional[str]) -> Optional[str]:
    """Encrypt a bank account number"""
    return get_encryption_service().encrypt(account)


def decrypt_bank_account(encrypted_account: Optional[str]) -> Optional[str]:
    """Decrypt a bank account number"""
    return get_encryption_service().decrypt(encrypted_account)


if __name__ == '__main__':
    # Test the encryption service
    print("=" * 60)
    print("Encryption Service Test")
    print("=" * 60)
    print()
    
    service = EncryptionService()
    
    if service.is_enabled():
        # Test SSN encryption
        ssn = "123-45-6789"
        encrypted = service.encrypt(ssn)
        decrypted = service.decrypt(encrypted)
        
        print(f"Original SSN:  {ssn}")
        print(f"Encrypted:     {encrypted[:50]}...")
        print(f"Decrypted:     {decrypted}")
        print(f"Match:         {ssn == decrypted}")
        print()
        
        # Test is_encrypted
        print(f"Is encrypted:  {service.is_encrypted(encrypted)}")
        print(f"Is plain text: {service.is_encrypted(ssn)}")
        print()
        
        print("✅ Encryption service working correctly")
    else:
        print("❌ Encryption service not enabled")
        print("   Set FIELD_ENCRYPTION_KEY environment variable")

