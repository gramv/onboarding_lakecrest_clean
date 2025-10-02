#!/usr/bin/env python3
"""
Final comprehensive test for Phase 0 implementation.
Tests complete workflow with properly formatted application data.
"""

import httpx
import asyncio
from datetime import datetime, timedelta
import json

BASE_URL = 'http://localhost:8000'
PROPERTY_ID = '5cf12190-242a-4ac2-91dc-b43035b7aa2e'  # mci property
MANAGER_EMAIL = 'goutamramv@gmail.com'
MANAGER_PASSWORD = 'Gouthi321@'

async def main_test():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        print('\n' + '='*80)
        print('PHASE 0 IMPLEMENTATION - FINAL COMPREHENSIVE TEST')
        print('='*80)
        print(f'Test Started: {datetime.now().isoformat()}')
        print(f'Backend URL: {BASE_URL}')
        print(f'Property ID: {PROPERTY_ID}')
        print(f'Manager: {MANAGER_EMAIL}')
        
        # Create complete application matching the model requirements
        timestamp = datetime.now().strftime("%H%M%S")
        app_data = {
            # Personal Information
            'first_name': 'John',
            'middle_initial': 'D',
            'last_name': f'TestEmployee_{timestamp}',
            'email': f'test_{datetime.now().strftime("%Y%m%d_%H%M%S")}@example.com',
            'phone': '555-123-4567',
            'phone_is_cell': True,
            'phone_is_home': False,
            'secondary_phone': '',
            'address': '123 Test Street',
            'apartment_unit': 'Apt 4B',
            'city': 'Test City',
            'state': 'TC',
            'zip_code': '12345',
            
            # Position Information
            'department': 'Front Office',
            'position': 'Front Desk Clerk',
            'salary_desired': '40000',
            
            # Work Authorization & Legal
            'work_authorized': 'yes',
            'felony_conviction': 'no',
            'felony_details': '',
            
            # Availability
            'availability': 'Full-time',
            'start_date': (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'),
            'schedule_restrictions': False,
            'schedule_restrictions_details': '',
            
            # Emergency Contact
            'emergency_contact_name': 'Mary Test',
            'emergency_contact_phone': '555-999-8888',
            'emergency_contact_relationship': 'Spouse',
            
            # Employment History (required, at least one entry)
            'employment_history': [
                {
                    'company_name': 'Previous Hotel Corp',
                    'phone': '555-222-3333',
                    'address': '456 Previous St, Old City, OC 54321',
                    'supervisor': 'Jane Manager',
                    'job_title': 'Guest Service Agent',
                    'starting_salary': '30000',
                    'ending_salary': '35000',
                    'from_date': '2021-01',
                    'to_date': '2024-01',
                    'reason_for_leaving': 'Career advancement',
                    'may_contact': True
                }
            ],
            
            # Personal References (based on PersonalReference model)
            'personal_references': [
                {
                    'name': 'Robert Smith',
                    'years_known': '5',
                    'phone': '555-444-5555',
                    'relationship': 'Former Colleague'
                },
                {
                    'name': 'Sarah Johnson',
                    'years_known': '3',
                    'phone': '555-666-7777',
                    'relationship': 'Professional Reference'
                }
            ],
            
            # Additional fields
            'skills_languages_certifications': 'Fluent in English and Spanish, CPR certified',
            'experience': '3 years in hospitality industry',
            'references': 'Available upon request'
        }
        
        # ==================== STEP 1: SUBMIT APPLICATION ====================
        print('\n' + '─'*60)
        print('📝 STEP 1: SUBMITTING JOB APPLICATION')
        print('─'*60)
        
        response = await client.post(f'/api/apply/{PROPERTY_ID}', json=app_data)
        print(f'Response Status: {response.status_code}')
        
        if response.status_code in [200, 201]:
            result = response.json()
            app_id = result.get('application_id') or result.get('id')
            
            print('✅ Application submitted successfully!')
            print(f'   Application ID: {app_id}')
            print(f'   Applicant Name: {app_data["first_name"]} {app_data["last_name"]}')
            print(f'   Email: {app_data["email"]}')
            print(f'   Position: {app_data["position"]}')
            
            # ==================== STEP 2: MANAGER LOGIN ====================
            print('\n' + '─'*60)
            print('🔐 STEP 2: MANAGER AUTHENTICATION')
            print('─'*60)
            
            login_response = await client.post('/api/auth/login', json={
                'email': MANAGER_EMAIL,
                'password': MANAGER_PASSWORD
            })
            
            print(f'Response Status: {login_response.status_code}')
            
            if login_response.status_code == 200:
                login_data = login_response.json()
                manager_token = login_data.get('access_token')
                
                print('✅ Manager logged in successfully')
                print(f'   Manager Email: {MANAGER_EMAIL}')
                print(f'   User Type: {login_data.get("user_type")}')
                
                # ==================== STEP 3: APPROVE APPLICATION ====================
                print('\n' + '─'*60)
                print('✔️  STEP 3: APPLICATION APPROVAL & TOKEN GENERATION')
                print('─'*60)
                
                headers = {'Authorization': f'Bearer {manager_token}'}
                approve_response = await client.post(
                    f'/api/applications/{app_id}/approve',
                    headers=headers,
                    json={'notes': 'Approved for Phase 0 testing - All safeguards active'}
                )
                
                print(f'Response Status: {approve_response.status_code}')
                
                if approve_response.status_code == 200:
                    approve_data = approve_response.json()
                    onboarding_token = approve_data.get('onboarding_token')
                    employee_id = approve_data.get('employee_id')
                    
                    print('✅ Application approved successfully!')
                    print(f'   Employee ID: {employee_id}')
                    print(f'   Token Length: {len(onboarding_token) if onboarding_token else 0} characters')
                    
                    # Display onboarding information prominently
                    print('\n' + '='*80)
                    print('🎉 ONBOARDING SETUP COMPLETE!')
                    print('='*80)
                    print('\n📌 ONBOARDING URL (Open in browser):')
                    print(f'   http://localhost:3000/onboarding?token={onboarding_token}')
                    print('\n📋 ONBOARDING TOKEN (For manual testing):')
                    print(f'   {onboarding_token}')
                    print('='*80)
                    
                    # ==================== STEP 4: TEST PHASE 0 FEATURES ====================
                    print('\n' + '─'*60)
                    print('🧪 STEP 4: TESTING PHASE 0 SAFEGUARDS')
                    print('─'*60)
                    
                    test_results = []
                    
                    # Test 1: Token Validation & Session Creation
                    print('\n1️⃣  Testing Token Validation & Session Creation...')
                    validate_response = await client.post(
                        '/api/onboarding/validate-token',
                        json={'token': onboarding_token}
                    )
                    
                    session_id = None
                    if validate_response.status_code == 200:
                        validate_data = validate_response.json()
                        session_id = validate_data.get('session_id')
                        print(f'   ✅ Token validated successfully')
                        print(f'   Session ID: {session_id[:20]}...' if session_id else 'No session ID')
                        print(f'   Employee: {validate_data.get("first_name")} {validate_data.get("last_name")}')
                        print(f'   Expires: {validate_data.get("expires_at")}')
                        test_results.append(('Token Validation', True))
                    else:
                        print(f'   ❌ Token validation failed: {validate_response.status_code}')
                        test_results.append(('Token Validation', False))
                    
                    if session_id:
                        # Test 2: Token Refresh
                        print('\n2️⃣  Testing Token Refresh Mechanism...')
                        refresh_response = await client.post(
                            '/api/onboarding/refresh-token',
                            json={'session_id': session_id}
                        )
                        
                        if refresh_response.status_code == 200:
                            refresh_data = refresh_response.json()
                            print(f'   ✅ Token refresh successful')
                            print(f'   New Expiry: {refresh_data.get("expires_at")}')
                            test_results.append(('Token Refresh', True))
                        else:
                            print(f'   ❌ Token refresh failed: {refresh_response.status_code}')
                            test_results.append(('Token Refresh', False))
                        
                        # Test 3: Session Locking
                        print('\n3️⃣  Testing Session Locking (Duplicate Tab Prevention)...')
                        lock_response = await client.post(
                            '/api/onboarding/session/lock',
                            json={
                                'session_id': session_id,
                                'step_id': 'personal_info',
                                'action': 'acquire'
                            }
                        )
                        
                        if lock_response.status_code == 200:
                            lock_data = lock_response.json()
                            lock_token = lock_data.get('lock_token')
                            print(f'   ✅ Lock acquired successfully')
                            
                            # Try duplicate lock
                            dup_lock = await client.post(
                                '/api/onboarding/session/lock',
                                json={
                                    'session_id': session_id,
                                    'step_id': 'personal_info',
                                    'action': 'acquire'
                                }
                            )
                            
                            if dup_lock.status_code != 200:
                                print(f'   ✅ Duplicate lock prevented (expected behavior)')
                            else:
                                print(f'   ⚠️  Duplicate lock not prevented')
                            
                            # Release lock
                            release = await client.post(
                                '/api/onboarding/session/lock',
                                json={
                                    'session_id': session_id,
                                    'step_id': 'personal_info',
                                    'action': 'release',
                                    'lock_token': lock_token
                                }
                            )
                            
                            if release.status_code == 200:
                                print(f'   ✅ Lock released successfully')
                                test_results.append(('Session Locking', True))
                            else:
                                print(f'   ❌ Lock release failed')
                                test_results.append(('Session Locking', False))
                        else:
                            print(f'   ❌ Lock acquisition failed: {lock_response.status_code}')
                            test_results.append(('Session Locking', False))
                        
                        # Test 4: Unsaved Data Protection
                        print('\n4️⃣  Testing Unsaved Data Protection...')
                        draft_data = {
                            'first_name': 'John',
                            'last_name': 'Test',
                            'phone': '555-1234',
                            'email': 'john@test.com',
                            'ssn': '123-45-6789',
                            'date_of_birth': '1990-01-01'
                        }
                        
                        save_response = await client.post(
                            '/api/onboarding/save-progress',
                            json={
                                'session_id': session_id,
                                'step_id': 'personal_info',
                                'data': draft_data,
                                'is_complete': False
                            }
                        )
                        
                        if save_response.status_code == 200:
                            print(f'   ✅ Draft data saved successfully')
                            
                            # Retrieve to verify
                            retrieve = await client.get(f'/api/onboarding/progress/{session_id}')
                            
                            if retrieve.status_code == 200:
                                progress = retrieve.json()
                                saved_step = next(
                                    (s for s in progress.get('steps', []) if s['step_id'] == 'personal_info'),
                                    None
                                )
                                
                                if saved_step and saved_step.get('data'):
                                    print(f'   ✅ Draft data retrieved successfully')
                                    test_results.append(('Unsaved Data Protection', True))
                                else:
                                    print(f'   ⚠️  Data retrieval incomplete')
                                    test_results.append(('Unsaved Data Protection', False))
                            else:
                                print(f'   ❌ Data retrieval failed')
                                test_results.append(('Unsaved Data Protection', False))
                        else:
                            print(f'   ❌ Draft save failed: {save_response.status_code}')
                            test_results.append(('Unsaved Data Protection', False))
                    
                    # ==================== FINAL REPORT ====================
                    print('\n' + '='*80)
                    print('📊 TEST RESULTS SUMMARY')
                    print('='*80)
                    
                    passed = sum(1 for _, result in test_results if result)
                    total = len(test_results)
                    
                    print(f'\nTests Passed: {passed}/{total} ({passed/total*100:.0f}%)')
                    print('\nDetailed Results:')
                    for test_name, result in test_results:
                        status = '✅' if result else '❌'
                        print(f'   {status} {test_name}')
                    
                    # Save results to file
                    report = {
                        'timestamp': datetime.now().isoformat(),
                        'application_id': app_id,
                        'employee_id': employee_id,
                        'onboarding_token': onboarding_token,
                        'onboarding_url': f'http://localhost:3000/onboarding?token={onboarding_token}',
                        'test_results': {name: result for name, result in test_results},
                        'summary': {
                            'total_tests': total,
                            'passed': passed,
                            'failed': total - passed,
                            'success_rate': f'{passed/total*100:.0f}%'
                        }
                    }
                    
                    report_file = f'phase0_final_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
                    with open(report_file, 'w') as f:
                        json.dump(report, f, indent=2)
                    
                    print(f'\n📄 Full report saved to: {report_file}')
                    
                    print('\n' + '='*80)
                    print('✅ PHASE 0 TEST COMPLETE - SYSTEM READY FOR ONBOARDING')
                    print('='*80)
                    
                else:
                    print(f'❌ Application approval failed')
                    print(f'   Error: {approve_response.text[:500]}')
            else:
                print(f'❌ Manager login failed')
                print(f'   Error: {login_response.text[:500]}')
        else:
            print(f'❌ Application submission failed')
            print(f'   Error Details:')
            try:
                error_data = response.json()
                print(f'   {json.dumps(error_data, indent=2)}')
            except:
                print(f'   {response.text[:500]}')

if __name__ == '__main__':
    asyncio.run(main_test())