#!/usr/bin/env python3
"""
Verify All Security Features in Database
Checks: Encryption, Audit Trail, Token Revocation, Signed URLs
"""

import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv
import json
from datetime import datetime

# Load environment variables
load_dotenv()

EMPLOYEE_ID = 'a0fc879c-3cfa-47d9-8268-848d304203e4'

def verify_all_features():
    """Verify all security features"""
    
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not supabase_key:
        print('❌ Missing Supabase credentials')
        return False
    
    supabase: Client = create_client(supabase_url, supabase_key)
    print('✅ Connected to Supabase\n')
    print('='*80)
    
    # 1. Check Employee Record
    print('\n📊 1. EMPLOYEE RECORD')
    print('='*80)
    employee = supabase.table('employees').select('*').eq('id', EMPLOYEE_ID).execute()
    if employee.data:
        emp = employee.data[0]
        print(f"✅ Employee ID: {emp['id']}")
        print(f"✅ Onboarding Status: {emp['onboarding_status']}")
        print(f"✅ Completed At: {emp.get('onboarding_completed_at', 'N/A')}")
        print(f"✅ Final Signature Timestamp: {emp.get('final_signature_timestamp', 'N/A')}")
        print(f"✅ Final Signature IP: {emp.get('final_signature_ip', 'N/A')}")
        print(f"\n🔒 ENCRYPTION STATUS:")
        print(f"   - SSN Encrypted: {emp.get('ssn_encrypted', 'None')}")
        print(f"   - Bank Account Encrypted: {emp.get('bank_account_encrypted', 'None')}")
        print(f"   - Bank Routing Encrypted: {emp.get('bank_routing_encrypted', 'None')}")
        
        if emp.get('ssn_encrypted'):
            print(f"\n   ✅ SSN IS ENCRYPTED (starts with: {emp['ssn_encrypted'][:20]}...)")
        else:
            print(f"\n   ⚠️  SSN NOT ENCRYPTED (may not have been entered)")
            
        if emp.get('bank_account_encrypted'):
            print(f"   ✅ BANK ACCOUNT IS ENCRYPTED (starts with: {emp['bank_account_encrypted'][:20]}...)")
        else:
            print(f"   ⚠️  BANK ACCOUNT NOT ENCRYPTED (may not have been entered)")
    
    # 2. Check Onboarding Sessions (Token Revocation)
    print('\n\n📊 2. ONBOARDING SESSIONS (TOKEN REVOCATION)')
    print('='*80)
    sessions = supabase.table('onboarding_sessions').select('*').eq('employee_id', EMPLOYEE_ID).execute()
    if sessions.data:
        for session in sessions.data:
            print(f"✅ Session ID: {session['id']}")
            print(f"✅ Status: {session.get('status', 'N/A')}")
            print(f"✅ Is Active: {session.get('is_active', 'N/A')}")
            print(f"✅ Revoked At: {session.get('revoked_at', 'N/A')}")
            print(f"✅ Revoked Reason: {session.get('revoked_reason', 'N/A')}")
            print(f"✅ Created At: {session.get('created_at', 'N/A')}")
            print(f"✅ Expires At: {session.get('expires_at', 'N/A')}")
            
            if session.get('is_active') == False:
                print(f"\n   🔒 TOKEN SUCCESSFULLY REVOKED!")
            else:
                print(f"\n   ⚠️  TOKEN STILL ACTIVE")
    else:
        print("⚠️  No sessions found")
    
    # 3. Check Audit Trail
    print('\n\n📊 3. AUDIT TRAIL (DOCUMENT ACCESS LOG)')
    print('='*80)
    audit_logs = supabase.table('document_access_log').select('*').eq('employee_id', EMPLOYEE_ID).order('accessed_at', desc=True).limit(10).execute()
    if audit_logs.data:
        print(f"✅ Found {len(audit_logs.data)} audit log entries\n")
        for i, log in enumerate(audit_logs.data, 1):
            print(f"   [{i}] Action: {log.get('action', 'N/A')}")
            print(f"       Document Type: {log.get('document_type', 'N/A')}")
            print(f"       File Path: {log.get('file_path', 'N/A')[:60]}...")
            print(f"       Accessed At: {log.get('accessed_at', 'N/A')}")
            print(f"       IP Address: {log.get('ip_address', 'N/A')}")
            print(f"       Expiration: {log.get('expiration_seconds', 'N/A')}s")
            print()
    else:
        print("⚠️  No audit logs found")
    
    # 4. Check Signed Documents
    print('\n📊 4. SIGNED DOCUMENTS')
    print('='*80)
    signed_docs = supabase.table('signed_documents').select('*').eq('employee_id', EMPLOYEE_ID).execute()
    if signed_docs.data:
        print(f"✅ Found {len(signed_docs.data)} signed documents\n")
        for i, doc in enumerate(signed_docs.data, 1):
            print(f"   [{i}] Document Type: {doc.get('document_type', 'N/A')}")
            print(f"       Signed At: {doc.get('signed_at', 'N/A')}")
            print(f"       IP Address: {doc.get('ip_address', 'N/A')}")
            print(f"       File Path: {doc.get('file_path', 'N/A')[:60]}...")
            print()
    else:
        print("⚠️  No signed documents found")
    
    # 5. Check Onboarding Form Data (for encrypted fields)
    print('\n📊 5. ONBOARDING FORM DATA (DIRECT DEPOSIT)')
    print('='*80)
    form_data = supabase.table('onboarding_form_data').select('*').eq('employee_id', EMPLOYEE_ID).eq('step_id', 'direct-deposit').execute()
    if form_data.data:
        for data in form_data.data:
            form_json = data.get('form_data', {})
            print(f"✅ Direct Deposit Form Found")
            print(f"   Bank Name: {form_json.get('bankName', 'N/A')}")
            print(f"   Account Type: {form_json.get('accountType', 'N/A')}")
            
            if 'bank_account_encrypted' in form_json:
                print(f"\n   🔒 BANK ACCOUNT ENCRYPTED IN FORM DATA:")
                print(f"      {form_json['bank_account_encrypted'][:50]}...")
            
            if 'bank_routing_encrypted' in form_json:
                print(f"\n   🔒 BANK ROUTING ENCRYPTED IN FORM DATA:")
                print(f"      {form_json['bank_routing_encrypted'][:50]}...")
    else:
        print("⚠️  No direct deposit form data found")
    
    # 6. Summary
    print('\n\n' + '='*80)
    print('📊 VERIFICATION SUMMARY')
    print('='*80)
    
    checks = []
    
    # Check 1: Onboarding Completed
    if employee.data and employee.data[0].get('onboarding_status') == 'completed':
        checks.append(('✅', 'Onboarding Status', 'COMPLETED'))
    else:
        checks.append(('❌', 'Onboarding Status', 'NOT COMPLETED'))
    
    # Check 2: Token Revoked
    if sessions.data and sessions.data[0].get('is_active') == False:
        checks.append(('✅', 'Token Revocation', 'REVOKED'))
    else:
        checks.append(('❌', 'Token Revocation', 'STILL ACTIVE'))
    
    # Check 3: Encryption
    if employee.data and (employee.data[0].get('ssn_encrypted') or employee.data[0].get('bank_account_encrypted')):
        checks.append(('✅', 'Field Encryption', 'ACTIVE'))
    else:
        checks.append(('⚠️ ', 'Field Encryption', 'NO ENCRYPTED DATA'))
    
    # Check 4: Audit Trail
    if audit_logs.data and len(audit_logs.data) > 0:
        checks.append(('✅', 'Audit Trail', f'{len(audit_logs.data)} ENTRIES'))
    else:
        checks.append(('❌', 'Audit Trail', 'NO ENTRIES'))
    
    # Check 5: Signed Documents
    if signed_docs.data and len(signed_docs.data) > 0:
        checks.append(('✅', 'Signed Documents', f'{len(signed_docs.data)} DOCUMENTS'))
    else:
        checks.append(('❌', 'Signed Documents', 'NO DOCUMENTS'))
    
    print()
    for icon, feature, status in checks:
        print(f"{icon} {feature:.<40} {status}")
    
    print('\n' + '='*80)
    
    # Overall status
    all_critical_passed = all(check[0] == '✅' for check in checks if check[1] in ['Onboarding Status', 'Token Revocation', 'Audit Trail'])
    
    if all_critical_passed:
        print('🎉 ALL CRITICAL SECURITY FEATURES VERIFIED!')
    else:
        print('⚠️  SOME FEATURES NEED ATTENTION')
    
    print('='*80)
    
    return True

if __name__ == '__main__':
    try:
        verify_all_features()
    except Exception as e:
        print(f'\n❌ Error: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)

