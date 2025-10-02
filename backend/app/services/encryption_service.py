"""
PII Encryption Service
Provides field-level encryption for sensitive data using AES-256-GCM
"""

import os
import json
import base64
import secrets
import logging
from typing import Any, Dict, Optional, Union, Tuple
from datetime import datetime, timezone
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidTag

from app.config.encryption_config import (
    ENCRYPTION_CONFIG,
    should_encrypt_field,
    get_masking_pattern,
    get_encryption_level,
    EncryptionLevel,
    AUDIT_CONFIG
)

logger = logging.getLogger(__name__)

class EncryptionError(Exception):
    """Base exception for encryption errors"""
    pass

class DecryptionError(Exception):
    """Base exception for decryption errors"""
    pass

class KeyManagementError(Exception):
    """Exception for key management issues"""
    pass

class EncryptionService:
    """
    Service for encrypting and decrypting PII data using AES-256-GCM
    """
    
    def __init__(self):
        """Initialize the encryption service with keys from environment"""
        self.backend = default_backend()
        self._initialize_keys()
        self.current_key_version = ENCRYPTION_CONFIG["key_version"]
        
    def _initialize_keys(self):
        """Initialize encryption keys from environment variables"""
        # Get master key from environment
        master_key_b64 = os.getenv("ENCRYPTION_MASTER_KEY")
        if not master_key_b64:
            # Generate a new key if not exists (should only happen in development)
            if os.getenv("ENVIRONMENT", "development") == "development":
                logger.warning("No ENCRYPTION_MASTER_KEY found; generating a temporary key for local development ONLY")
                master_key = secrets.token_bytes(32)
                master_key_b64 = base64.b64encode(master_key).decode('utf-8')
                # SECURITY: Do NOT log secrets. Provide guidance only.
                logger.info("A temporary encryption key was generated for this process.")
                logger.info("To persist locally, generate your own base64 key and add to .env as ENCRYPTION_MASTER_KEY.")
                logger.info("Example: python3 -c \"import base64,os; print(base64.b64encode(os.urandom(32)).decode())\"")
            else:
                raise KeyManagementError("ENCRYPTION_MASTER_KEY must be set in production")
        
        try:
            self.master_key = base64.b64decode(master_key_b64)
            if len(self.master_key) != 32:
                raise KeyManagementError("Master key must be 32 bytes (256 bits)")
        except Exception as e:
            raise KeyManagementError(f"Invalid ENCRYPTION_MASTER_KEY: {e}")
        
        # Store previous keys for decryption (key rotation support)
        self.key_versions = {
            1: self.master_key  # Current version
        }
        
        # Load previous key versions if they exist
        for version in range(2, 10):  # Support up to 10 key versions
            key_env_name = f"ENCRYPTION_KEY_V{version}"
            key_b64 = os.getenv(key_env_name)
            if key_b64:
                try:
                    self.key_versions[version] = base64.b64decode(key_b64)
                except Exception as e:
                    logger.warning(f"Failed to load key version {version}: {e}")
    
    def _derive_key(self, salt: bytes, key_version: int = None) -> bytes:
        """
        Derive an encryption key from the master key using PBKDF2
        
        Args:
            salt: Salt for key derivation
            key_version: Version of key to use (default: current)
        
        Returns:
            bytes: Derived 256-bit key
        """
        if key_version is None:
            key_version = self.current_key_version
        
        if key_version not in self.key_versions:
            raise KeyManagementError(f"Key version {key_version} not found")
        
        master_key = self.key_versions[key_version]
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=ENCRYPTION_CONFIG["iterations"],
            backend=self.backend
        )
        return kdf.derive(master_key)
    
    def encrypt_field(self, value: Any, field_name: str = None) -> Dict[str, Any]:
        """
        Encrypt a single field value using AES-256-GCM
        
        Args:
            value: The value to encrypt (will be converted to string)
            field_name: Optional field name for audit logging
        
        Returns:
            Dict containing encrypted data and metadata
        """
        if value is None:
            return None
        
        try:
            # Convert value to bytes
            if isinstance(value, bytes):
                plaintext = value
            else:
                plaintext = str(value).encode('utf-8')
            
            # Generate random salt and nonce
            salt = secrets.token_bytes(ENCRYPTION_CONFIG["salt_bytes"])
            nonce = secrets.token_bytes(ENCRYPTION_CONFIG["nonce_bytes"])
            
            # Derive key
            key = self._derive_key(salt, self.current_key_version)
            
            # Create cipher
            cipher = Cipher(
                algorithms.AES(key),
                modes.GCM(nonce),
                backend=self.backend
            )
            encryptor = cipher.encryptor()
            
            # Encrypt data
            ciphertext = encryptor.update(plaintext) + encryptor.finalize()
            
            # Get authentication tag
            tag = encryptor.tag
            
            # Create encrypted data structure
            encrypted_data = {
                "v": self.current_key_version,  # Key version
                "s": base64.b64encode(salt).decode('utf-8'),  # Salt
                "n": base64.b64encode(nonce).decode('utf-8'),  # Nonce
                "c": base64.b64encode(ciphertext).decode('utf-8'),  # Ciphertext
                "t": base64.b64encode(tag).decode('utf-8'),  # Authentication tag
                "e": datetime.now(timezone.utc).isoformat(),  # Encrypted at
                "l": get_encryption_level(field_name).value if field_name else "high"  # Level
            }
            
            # Log encryption event if configured
            if AUDIT_CONFIG.get("log_encryption_events") and field_name:
                logger.info(f"Encrypted field '{field_name}' with key version {self.current_key_version}")
            
            return encrypted_data
            
        except Exception as e:
            logger.error(f"Encryption failed for field '{field_name}': {e}")
            raise EncryptionError(f"Failed to encrypt field: {e}")
    
    def decrypt_field(self, encrypted_data: Union[Dict, str], field_name: str = None) -> Any:
        """
        Decrypt a field value encrypted with AES-256-GCM
        
        Args:
            encrypted_data: Encrypted data structure or base64 string
            field_name: Optional field name for audit logging
        
        Returns:
            Decrypted value
        """
        if encrypted_data is None:
            return None
        
        # Handle backward compatibility - if it's not encrypted, return as-is
        if isinstance(encrypted_data, str) and not encrypted_data.startswith('{'):
            # Check if it might be a plain value (backward compatibility)
            try:
                json.loads(encrypted_data)
            except:
                # Not JSON, might be plain text
                return encrypted_data
        
        try:
            # Parse encrypted data structure
            if isinstance(encrypted_data, str):
                encrypted_data = json.loads(encrypted_data)
            
            if not isinstance(encrypted_data, dict):
                # Not encrypted, return as-is (backward compatibility)
                return encrypted_data
            
            # Check for required fields
            required_fields = ['v', 's', 'n', 'c', 't']
            if not all(field in encrypted_data for field in required_fields):
                # Not properly encrypted, might be plain data
                return encrypted_data
            
            # Extract components
            key_version = encrypted_data['v']
            salt = base64.b64decode(encrypted_data['s'])
            nonce = base64.b64decode(encrypted_data['n'])
            ciphertext = base64.b64decode(encrypted_data['c'])
            tag = base64.b64decode(encrypted_data['t'])
            
            # Derive key using the appropriate version
            key = self._derive_key(salt, key_version)
            
            # Create cipher
            cipher = Cipher(
                algorithms.AES(key),
                modes.GCM(nonce, tag),
                backend=self.backend
            )
            decryptor = cipher.decryptor()
            
            # Decrypt data
            plaintext = decryptor.update(ciphertext) + decryptor.finalize()
            
            # Log decryption event if configured
            if AUDIT_CONFIG.get("log_decryption_events") and field_name:
                logger.info(f"Decrypted field '{field_name}' using key version {key_version}")
            
            # Return as string
            return plaintext.decode('utf-8')
            
        except InvalidTag:
            logger.error(f"Authentication failed for field '{field_name}' - data may be tampered")
            raise DecryptionError("Authentication failed - data integrity compromised")
        except Exception as e:
            # If decryption fails, check if it's unencrypted data (backward compatibility)
            if isinstance(encrypted_data, (str, int, float, bool)):
                return encrypted_data
            logger.error(f"Decryption failed for field '{field_name}': {e}")
            raise DecryptionError(f"Failed to decrypt field: {e}")
    
    def mask_value(self, value: Any, field_name: str) -> str:
        """
        Mask a sensitive value for display purposes
        
        Args:
            value: The value to mask
            field_name: Field name to determine masking pattern
        
        Returns:
            str: Masked value
        """
        if value is None or value == "":
            return ""
        
        value_str = str(value)
        pattern = get_masking_pattern(field_name)
        
        # Remove any formatting characters for consistent masking
        clean_value = ''.join(c for c in value_str if c.isalnum())
        
        if not clean_value:
            return "****"
        
        # Apply masking pattern
        if "{last4}" in pattern and len(clean_value) >= 4:
            return pattern.format(last4=clean_value[-4:])
        elif "{last3}" in pattern and len(clean_value) >= 3:
            return pattern.format(last3=clean_value[-3:])
        else:
            # Default masking - show last 4 characters
            if len(clean_value) > 4:
                return "*" * (len(clean_value) - 4) + clean_value[-4:]
            else:
                return "*" * len(clean_value)
    
    def encrypt_dict(self, data: Dict[str, Any], prefix: str = "") -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Recursively encrypt sensitive fields in a dictionary
        
        Args:
            data: Dictionary containing data to encrypt
            prefix: Current path prefix for nested fields
        
        Returns:
            Tuple of (encrypted_dict, encryption_metadata)
        """
        if not data:
            return data, {}
        
        encrypted_dict = {}
        metadata = {}
        
        for key, value in data.items():
            field_path = f"{prefix}.{key}" if prefix else key
            
            if value is None:
                encrypted_dict[key] = None
                continue
            
            # Check if this field should be encrypted
            if should_encrypt_field(field_path):
                # Encrypt the value
                encrypted_value = self.encrypt_field(value, field_path)
                encrypted_dict[key] = encrypted_value
                metadata[field_path] = {
                    "encrypted": True,
                    "masked": self.mask_value(value, field_path),
                    "level": get_encryption_level(field_path).value
                }
            elif isinstance(value, dict):
                # Recursively process nested dictionaries
                nested_encrypted, nested_metadata = self.encrypt_dict(value, field_path)
                encrypted_dict[key] = nested_encrypted
                metadata.update(nested_metadata)
            elif isinstance(value, list):
                # Process lists (might contain dicts)
                encrypted_list = []
                for i, item in enumerate(value):
                    if isinstance(item, dict):
                        item_path = f"{field_path}[{i}]"
                        nested_encrypted, nested_metadata = self.encrypt_dict(item, item_path)
                        encrypted_list.append(nested_encrypted)
                        metadata.update(nested_metadata)
                    else:
                        encrypted_list.append(item)
                encrypted_dict[key] = encrypted_list
            else:
                # Keep non-sensitive fields as-is
                encrypted_dict[key] = value
        
        return encrypted_dict, metadata
    
    def decrypt_dict(self, data: Dict[str, Any], prefix: str = "") -> Dict[str, Any]:
        """
        Recursively decrypt encrypted fields in a dictionary
        
        Args:
            data: Dictionary containing encrypted data
            prefix: Current path prefix for nested fields
        
        Returns:
            Dict with decrypted values
        """
        if not data:
            return data
        
        decrypted_dict = {}
        
        for key, value in data.items():
            field_path = f"{prefix}.{key}" if prefix else key
            
            if value is None:
                decrypted_dict[key] = None
                continue
            
            # Check if this is an encrypted field structure
            if isinstance(value, dict) and 'v' in value and 'c' in value:
                # This looks like encrypted data
                try:
                    decrypted_dict[key] = self.decrypt_field(value, field_path)
                except DecryptionError:
                    # If decryption fails, it might not be encrypted
                    if 'v' not in value or 'c' not in value or 't' not in value:
                        # Not our encryption format, treat as nested dict
                        decrypted_dict[key] = self.decrypt_dict(value, field_path)
                    else:
                        # Real decryption error
                        raise
            elif isinstance(value, dict):
                # Recursively process nested dictionaries
                decrypted_dict[key] = self.decrypt_dict(value, field_path)
            elif isinstance(value, list):
                # Process lists
                decrypted_list = []
                for i, item in enumerate(value):
                    if isinstance(item, dict):
                        item_path = f"{field_path}[{i}]"
                        decrypted_list.append(self.decrypt_dict(item, item_path))
                    else:
                        decrypted_list.append(item)
                decrypted_dict[key] = decrypted_list
            else:
                # Keep as-is
                decrypted_dict[key] = value
        
        return decrypted_dict
    
    def get_masked_dict(self, data: Dict[str, Any], prefix: str = "") -> Dict[str, Any]:
        """
        Create a dictionary with masked values for sensitive fields
        
        Args:
            data: Dictionary containing sensitive data
            prefix: Current path prefix for nested fields
        
        Returns:
            Dict with masked sensitive values
        """
        if not data:
            return data
        
        masked_dict = {}
        
        for key, value in data.items():
            field_path = f"{prefix}.{key}" if prefix else key
            
            if value is None:
                masked_dict[key] = None
                continue
            
            # Check if this field should be masked
            if should_encrypt_field(field_path):
                # Mask the value
                if isinstance(value, dict) and 'v' in value and 'c' in value:
                    # Already encrypted, try to get masked value from metadata
                    masked_dict[key] = "****" # Default mask for encrypted
                else:
                    masked_dict[key] = self.mask_value(value, field_path)
            elif isinstance(value, dict):
                # Recursively process nested dictionaries
                masked_dict[key] = self.get_masked_dict(value, field_path)
            elif isinstance(value, list):
                # Process lists
                masked_list = []
                for i, item in enumerate(value):
                    if isinstance(item, dict):
                        item_path = f"{field_path}[{i}]"
                        masked_list.append(self.get_masked_dict(item, item_path))
                    else:
                        masked_list.append(item)
                masked_dict[key] = masked_list
            else:
                # Keep non-sensitive fields as-is
                masked_dict[key] = value
        
        return masked_dict
    
    def rotate_key(self, data: Dict[str, Any], new_version: int) -> Dict[str, Any]:
        """
        Re-encrypt data with a new key version (for key rotation)
        
        Args:
            data: Encrypted data to rotate
            new_version: New key version to use
        
        Returns:
            Dict with re-encrypted data
        """
        # First decrypt with old key
        decrypted = self.decrypt_dict(data)
        
        # Update current key version
        old_version = self.current_key_version
        self.current_key_version = new_version
        
        try:
            # Re-encrypt with new key
            encrypted, _ = self.encrypt_dict(decrypted)
            
            if AUDIT_CONFIG.get("log_key_rotation"):
                logger.info(f"Rotated encryption from key v{old_version} to v{new_version}")
            
            return encrypted
        except Exception as e:
            # Restore old version on failure
            self.current_key_version = old_version
            raise KeyManagementError(f"Key rotation failed: {e}")


# Singleton instance
_encryption_service = None

def get_encryption_service() -> EncryptionService:
    """Get or create the singleton encryption service instance"""
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service