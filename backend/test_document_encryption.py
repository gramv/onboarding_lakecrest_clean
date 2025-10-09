#!/usr/bin/env python3
"""Test document encryption service"""

import sys
sys.path.insert(0, '.')

from dotenv import load_dotenv
load_dotenv('.env')

print('🧪 Phase 3 Testing - Document Encryption at Rest\n')
print('='*70)

# Test 1: Document Encryption Service
print('\n📝 Test 1: Document Encryption Service')
print('-'*70)

try:
    from app.services.document_encryption_service import DocumentEncryptionService
    
    service = DocumentEncryptionService()
    print('✅ Document encryption service initialized')
    print(f'   Enabled: {service.is_enabled()}')
    
    # Test encryption
    print('\n✅ Testing encryption:')
    test_content = b'This is a test PDF document content with sensitive data.'
    print(f'   Original size: {len(test_content)} bytes')
    
    encrypted, metadata = service.encrypt_document(
        test_content,
        document_type='i9_form',
        employee_id='test-emp-123'
    )
    
    print(f'   Encrypted size: {len(encrypted)} bytes')
    print(f'   Encryption algorithm: {metadata["encryption_algorithm"]}')
    
    # Test decryption
    print('\n✅ Testing decryption:')
    decrypted, was_encrypted = service.decrypt_document(
        encrypted,
        document_type='i9_form',
        employee_id='test-emp-123'
    )
    
    print(f'   Decrypted size: {len(decrypted)} bytes')
    print(f'   Was encrypted: {was_encrypted}')
    print(f'   Content matches: {decrypted == test_content}')
    
    if decrypted != test_content:
        print('   ❌ Content mismatch!')
        sys.exit(1)
    
    # Test lazy migration (unencrypted content)
    print('\n✅ Testing lazy migration (unencrypted content):')
    unencrypted_content = b'This is an old unencrypted document.'
    
    decrypted_legacy, was_encrypted_legacy = service.decrypt_document(
        unencrypted_content,
        document_type='legacy_doc',
        employee_id='test-emp-456',
        fallback_to_unencrypted=True
    )
    
    print(f'   Was encrypted: {was_encrypted_legacy}')
    print(f'   Content returned as-is: {decrypted_legacy == unencrypted_content}')
    
    if not was_encrypted_legacy and decrypted_legacy == unencrypted_content:
        print('   ✅ Lazy migration working correctly!')
    else:
        print('   ❌ Lazy migration failed!')
        sys.exit(1)
    
    # Test is_encrypted check
    print('\n✅ Testing encryption detection:')
    is_enc_1 = service.is_encrypted(encrypted)
    is_enc_2 = service.is_encrypted(unencrypted_content)
    
    print(f'   Encrypted content detected: {is_enc_1}')
    print(f'   Unencrypted content detected: {is_enc_2}')
    
    if is_enc_1 and not is_enc_2:
        print('   ✅ Encryption detection working correctly!')
    else:
        print('   ❌ Encryption detection failed!')
        sys.exit(1)
    
    print('\n✅ All document encryption tests passed!')
    
except Exception as e:
    print(f'❌ Document encryption test failed: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 2: Convenience Functions
print('\n\n📦 Test 2: Convenience Functions')
print('-'*70)

try:
    from app.services.document_encryption_service import (
        encrypt_document, decrypt_document, is_document_encrypted
    )
    
    # Test convenience functions
    test_doc = b'Test document for convenience functions'
    
    encrypted_doc, meta = encrypt_document(test_doc, 'w4_form', 'emp-789')
    print(f'✅ encrypt_document(): {len(test_doc)} → {len(encrypted_doc)} bytes')
    
    decrypted_doc, was_enc = decrypt_document(encrypted_doc, 'w4_form', 'emp-789')
    print(f'✅ decrypt_document(): {len(encrypted_doc)} → {len(decrypted_doc)} bytes')
    
    is_enc = is_document_encrypted(encrypted_doc)
    print(f'✅ is_document_encrypted(): {is_enc}')
    
    if decrypted_doc == test_doc and was_enc and is_enc:
        print('\n✅ Convenience functions working correctly!')
    else:
        print('\n❌ Convenience functions failed!')
        sys.exit(1)
    
except Exception as e:
    print(f'❌ Convenience functions test failed: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)

print('\n\n' + '='*70)
print('✅ ALL PHASE 3 TESTS PASSED! 🎉')
print('='*70)
print('\nPhase 3 document encryption is working correctly!')
print('- Document encryption: ✅')
print('- Document decryption: ✅')
print('- Lazy migration: ✅')
print('- Encryption detection: ✅')
print('- Convenience functions: ✅')

