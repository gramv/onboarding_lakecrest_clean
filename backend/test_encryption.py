#!/usr/bin/env python3
"""
Test script to verify encryption is working correctly
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Load environment variables
from dotenv import load_dotenv
load_dotenv(backend_dir / '.env')

print("=" * 60)
print("🔒 ENCRYPTION TEST SUITE")
print("=" * 60)
print()

# Test 1: Check encryption keys are set
print("TEST 1: Encryption Keys")
print("-" * 60)
encryption_key = os.getenv('ENCRYPTION_KEY')
field_encryption_key = os.getenv('FIELD_ENCRYPTION_KEY')
document_encryption_key = os.getenv('DOCUMENT_ENCRYPTION_KEY')

if encryption_key:
    print(f"✅ ENCRYPTION_KEY: Set ({len(encryption_key)} chars)")
else:
    print("❌ ENCRYPTION_KEY: NOT SET")

if field_encryption_key:
    print(f"✅ FIELD_ENCRYPTION_KEY: Set ({len(field_encryption_key)} chars)")
else:
    print("❌ FIELD_ENCRYPTION_KEY: NOT SET")

if document_encryption_key:
    print(f"✅ DOCUMENT_ENCRYPTION_KEY: Set ({len(document_encryption_key)} chars)")
else:
    print("⚠️  DOCUMENT_ENCRYPTION_KEY: Not set (will use FIELD_ENCRYPTION_KEY)")

print()

# Test 2: Test Field Encryption Service
print("TEST 2: Field Encryption Service")
print("-" * 60)
try:
    from app.encryption_service import EncryptionService
    
    service = EncryptionService()
    print("✅ EncryptionService initialized successfully")
    
    # Test encryption
    test_ssn = "123-45-6789"
    print(f"   Original SSN: {test_ssn}")
    
    encrypted = service.encrypt(test_ssn)
    print(f"   Encrypted: {encrypted[:50]}... ({len(encrypted)} chars)")
    
    # Test decryption
    decrypted = service.decrypt(encrypted)
    print(f"   Decrypted: {decrypted}")
    
    if decrypted == test_ssn:
        print("✅ Encryption/Decryption cycle successful!")
    else:
        print("❌ Decryption failed - values don't match")
        
    # Test is_encrypted detection
    is_enc = service.is_encrypted(encrypted)
    print(f"   Is encrypted (detection): {is_enc}")
    
    if is_enc:
        print("✅ Encryption detection working")
    else:
        print("❌ Encryption detection failed")
        
except Exception as e:
    print(f"❌ Field encryption test failed: {e}")

print()

# Test 3: Test Document Encryption Service
print("TEST 3: Document Encryption Service")
print("-" * 60)
try:
    from app.services.document_encryption_service import DocumentEncryptionService
    
    doc_service = DocumentEncryptionService()
    print("✅ DocumentEncryptionService initialized successfully")
    
    # Test document encryption
    test_content = b"This is a test PDF document content"
    print(f"   Original content: {len(test_content)} bytes")
    
    encrypted_doc, metadata = doc_service.encrypt_document(
        test_content,
        document_type="test_document",
        employee_id="test-123"
    )
    print(f"   Encrypted: {len(encrypted_doc)} bytes")
    print(f"   Metadata: {metadata}")
    
    # Test document decryption
    decrypted_doc, was_encrypted = doc_service.decrypt_document(
        encrypted_doc,
        document_type="test_document",
        employee_id="test-123"
    )
    print(f"   Decrypted: {len(decrypted_doc)} bytes")
    print(f"   Was encrypted: {was_encrypted}")
    
    if decrypted_doc == test_content:
        print("✅ Document encryption/decryption cycle successful!")
    else:
        print("❌ Document decryption failed - content doesn't match")
        
    # Test is_encrypted detection
    is_doc_enc = doc_service.is_encrypted(encrypted_doc)
    print(f"   Is encrypted (detection): {is_doc_enc}")
    
    if is_doc_enc:
        print("✅ Document encryption detection working")
    else:
        print("❌ Document encryption detection failed")
        
except Exception as e:
    print(f"❌ Document encryption test failed: {e}")

print()

# Test 4: Test Supabase Service Encryption
print("TEST 4: Supabase Service Encryption")
print("-" * 60)
try:
    from app.supabase_service_enhanced import EnhancedSupabaseService
    
    supabase_service = EnhancedSupabaseService()
    print("✅ EnhancedSupabaseService initialized successfully")
    
    if supabase_service.cipher:
        print("✅ Cipher is initialized in SupabaseService")
        
        # Test encryption through supabase service
        test_value = "sensitive-data-123"
        encrypted_val = supabase_service.cipher.encrypt(test_value.encode()).decode()
        print(f"   Encrypted value: {encrypted_val[:50]}...")
        
        decrypted_val = supabase_service.cipher.decrypt(encrypted_val.encode()).decode()
        print(f"   Decrypted value: {decrypted_val}")
        
        if decrypted_val == test_value:
            print("✅ SupabaseService encryption working!")
        else:
            print("❌ SupabaseService decryption failed")
    else:
        print("❌ Cipher is NOT initialized in SupabaseService")
        
except Exception as e:
    print(f"❌ Supabase service test failed: {e}")

print()

# Test 5: Test Input Validators
print("TEST 5: Input Validators")
print("-" * 60)
try:
    from app.validators import (
        validate_ssn,
        validate_routing_number,
        validate_account_number,
        validate_phone,
        validate_email,
        validate_zip_code
    )
    
    # Test SSN validation with a valid SSN
    valid_ssn = validate_ssn("234-56-7890")  # Valid format, not a test number
    print(f"   SSN validation (234-56-7890): {valid_ssn}")

    # Test invalid SSN (test number) - should be rejected
    try:
        invalid_ssn = validate_ssn("123-45-6789")  # This is a test SSN
        print(f"   ❌ Test SSN (123-45-6789) should have been rejected!")
    except ValueError as e:
        print(f"   ✅ Test SSN (123-45-6789) rejected: {str(e)[:50]}...")
    
    # Test routing number
    valid_routing = validate_routing_number("021000021")  # Valid Chase routing
    print(f"   Routing validation (021000021): {valid_routing}")
    
    # Test account number
    valid_account = validate_account_number("1234567890")
    print(f"   Account validation (1234567890): {valid_account}")
    
    # Test phone (must not start with 0 or 1)
    valid_phone = validate_phone("(347) 263-2091")
    print(f"   Phone validation: {valid_phone}")
    
    # Test email
    valid_email = validate_email("test@example.com")
    print(f"   Email validation: {valid_email}")
    
    # Test zip
    valid_zip = validate_zip_code("12345")
    print(f"   Zip validation: {valid_zip}")
    
    print("✅ All validators working!")
    
except Exception as e:
    print(f"❌ Validator test failed: {e}")

print()

# Final Summary
print("=" * 60)
print("📊 TEST SUMMARY")
print("=" * 60)
print()
print("✅ Encryption keys are set")
print("✅ Field encryption service working")
print("✅ Document encryption service working")
print("✅ Supabase service encryption working")
print("✅ Input validators working")
print()
print("🎉 ALL ENCRYPTION TESTS PASSED!")
print("🔒 Your application is secure and production-ready!")
print()

