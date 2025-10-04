#!/usr/bin/env python3
"""
Generate encryption key for field-level encryption

This script generates a secure Fernet encryption key and provides
instructions for adding it to your environment.

IMPORTANT: 
- Store this key securely!
- Back it up in a secure location (password manager, vault)
- If you lose this key, encrypted data cannot be recovered
- Do NOT commit this key to git
"""

import sys

try:
    from cryptography.fernet import Fernet
except ImportError:
    print("❌ cryptography package not installed!")
    print()
    print("Install it with:")
    print("  pip install cryptography")
    print()
    sys.exit(1)

print("=" * 80)
print("FIELD ENCRYPTION KEY GENERATOR")
print("=" * 80)
print()

# Generate key
key = Fernet.generate_key().decode()

print("✅ Generated new encryption key:")
print()
print(f"  {key}")
print()
print("=" * 80)
print("IMPORTANT - READ THIS")
print("=" * 80)
print()
print("1. BACK UP THIS KEY SECURELY")
print("   - Save in password manager (1Password, LastPass, etc.)")
print("   - Store in secure vault")
print("   - If you lose this key, encrypted data CANNOT be recovered!")
print()
print("2. ADD TO ENVIRONMENT")
print()
print("   For local development (.env file):")
print(f"   FIELD_ENCRYPTION_KEY={key}")
print()
print("   For Heroku:")
print(f"   heroku config:set FIELD_ENCRYPTION_KEY=\"{key}\" -a YOUR_APP_NAME")
print()
print("   For other platforms:")
print("   - Add as environment variable in your deployment platform")
print("   - Name: FIELD_ENCRYPTION_KEY")
print(f"   - Value: {key}")
print()
print("3. DO NOT COMMIT TO GIT")
print("   - Never commit this key to version control")
print("   - .env file should be in .gitignore")
print("   - Only store in secure environment variables")
print()
print("4. KEY ROTATION (Future)")
print("   - This version does not support key rotation")
print("   - To rotate: decrypt all data with old key, re-encrypt with new key")
print("   - Plan for key rotation in production systems")
print()
print("=" * 80)
print("NEXT STEPS")
print("=" * 80)
print()
print("1. Copy the key above")
print("2. Add to backend/.env file:")
print(f"   echo 'FIELD_ENCRYPTION_KEY=\"{key}\"' >> backend/.env")
print()
print("3. Add to Heroku (if using):")
print(f"   heroku config:set FIELD_ENCRYPTION_KEY=\"{key}\" -a YOUR_APP_NAME")
print()
print("4. Restart your backend")
print("5. Run migration: 002_add_encrypted_fields.sql")
print("6. Test encryption service")
print()
print("=" * 80)

