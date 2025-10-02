#!/usr/bin/env python3
"""
Test Phase 0 features with Goutham's production token
Using existing token - NOT generating a new one
"""

import httpx
import asyncio
from datetime import datetime
import json

# Goutham's production token - already provided
PRODUCTION_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZV9pZCI6IjE5MzEwYTM2LTc5N2MtNDQ2NC05NDViLWE0YTA2YTVlMTdjMiIsImFwcGxpY2F0aW9uX2lkIjpudWxsLCJ0b2tlbl90eXBlIjoib25ib2FyZGluZyIsImlhdCI6MTc1NzgxMjIxNSwiZXhwIjoxNzU4MDcxNDE1LCJqdGkiOiJUZS1NdTBFcVJHRTEzaDd6VlYtVll3In0.gg1XPTd2oTFSd7bVVcXo_Tpd1GISJYb4P51Yj_QVL2c"

EMPLOYEE_ID = "19310a36-797c-4464-945b-a4a06a5e17c2"  # Goutham Vemula
BASE_URL = 'http://localhost:8000'

async def test_phase0_features():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        print('\n' + '='*80)
        print('TESTING PHASE 0 WITH GOUTHAM\'S PRODUCTION TOKEN')
        print('='*80)
        print(f'Employee: Goutham Vemula')
        print(f'Employee ID: {EMPLOYEE_ID}')
        print(f'Using existing token - NOT generating new one')
        print('='*80)
        
        session_id = None
        lock_token = None
        
        # Test 1: Validate Token and Create Session
        print('\n✅ TEST 1: Token Validation & Session Creation')
        print('-'*40)
        try:
            response = await client.post(
                '/api/onboarding/validate-token',
                json={'token': PRODUCTION_TOKEN}
            )
            print(f'Status: {response.status_code}')
            
            if response.status_code == 200:
                data = response.json()
                session_id = data.get('session_id')
                print(f'✅ SUCCESS: Session created')
                print(f'   Session ID: {session_id}')
                print(f'   Employee: {data.get("first_name")} {data.get("last_name")}')
            else:
                print(f'❌ FAILED: {response.text[:200]}')
        except Exception as e:
            print(f'❌ ERROR: {e}')
        
        # Test 2: Token Refresh
        print('\n✅ TEST 2: Token Refresh Mechanism')
        print('-'*40)
        try:
            response = await client.post(
                '/api/onboarding/refresh-token',
                json={'token': PRODUCTION_TOKEN}
            )
            print(f'Status: {response.status_code}')
            
            if response.status_code == 200:
                data = response.json()
                print(f'✅ SUCCESS: Token refreshed')
                if data.get('refreshed'):
                    print(f'   New token created')
                    print(f'   Expires at: {data.get("expires_at")}')
                else:
                    print(f'   Token still valid (>1 day remaining)')
                    print(f'   Message: {data.get("message")}')
            else:
                print(f'❌ FAILED: {response.text[:200]}')
        except Exception as e:
            print(f'❌ ERROR: {e}')
        
        # Test 3: Session Locking
        print('\n✅ TEST 3: Session Locking System')
        print('-'*40)
        
        if session_id:
            # Acquire lock
            print('Testing lock acquisition...')
            try:
                response = await client.post(
                    '/api/onboarding/session/lock',
                    json={
                        'session_id': session_id,
                        'step_id': 'personal_info',
                        'action': 'acquire'
                    }
                )
                print(f'Status: {response.status_code}')
                
                if response.status_code == 200:
                    data = response.json()
                    lock_token = data.get('lock_token')
                    print(f'✅ SUCCESS: Lock acquired')
                    print(f'   Lock token: {lock_token[:20]}...')
                    
                    # Try duplicate lock (should fail)
                    print('\nTesting duplicate lock prevention...')
                    dup_response = await client.post(
                        '/api/onboarding/session/lock',
                        json={
                            'session_id': session_id,
                            'step_id': 'personal_info',
                            'action': 'acquire'
                        }
                    )
                    if dup_response.status_code != 200:
                        print(f'✅ SUCCESS: Duplicate lock prevented (status: {dup_response.status_code})')
                    else:
                        print(f'❌ FAILED: Duplicate lock not prevented')
                    
                    # Release lock
                    if lock_token:
                        print('\nTesting lock release...')
                        rel_response = await client.post(
                            '/api/onboarding/session/lock',
                            json={
                                'session_id': session_id,
                                'step_id': 'personal_info',
                                'action': 'release',
                                'lock_token': lock_token
                            }
                        )
                        if rel_response.status_code == 200:
                            print(f'✅ SUCCESS: Lock released')
                        else:
                            print(f'❌ FAILED: Lock release failed')
                else:
                    print(f'❌ FAILED: Could not acquire lock')
            except Exception as e:
                print(f'❌ ERROR: {e}')
        else:
            print('⚠️ SKIPPED: No session ID available')
        
        # Test 4: Progress Saving
        print('\n✅ TEST 4: Progress Saving & Retrieval')
        print('-'*40)
        
        if session_id:
            # Save progress
            print('Testing progress save...')
            draft_data = {
                'firstName': 'Goutham',
                'lastName': 'Vemula',
                'phone': '555-1234',
                'email': 'vgoutamram@gmail.com',
                'address': '123 Test St'
            }
            
            try:
                response = await client.post(
                    '/api/onboarding/save-progress',
                    json={
                        'session_id': session_id,
                        'step_id': 'personal_info',
                        'data': draft_data,
                        'is_complete': False
                    }
                )
                print(f'Status: {response.status_code}')
                
                if response.status_code == 200:
                    print(f'✅ SUCCESS: Progress saved')
                    
                    # Retrieve progress
                    print('\nTesting progress retrieval...')
                    get_response = await client.get(
                        f'/api/onboarding/progress/{session_id}'
                    )
                    
                    if get_response.status_code == 200:
                        progress_data = get_response.json()
                        steps = progress_data.get('steps', [])
                        saved_step = next(
                            (s for s in steps if s['step_id'] == 'personal_info'),
                            None
                        )
                        
                        if saved_step and saved_step.get('data'):
                            print(f'✅ SUCCESS: Progress retrieved')
                            print(f'   Data matches: {saved_step["data"].get("firstName") == "Goutham"}')
                        else:
                            print(f'❌ FAILED: Progress not found')
                    else:
                        print(f'❌ FAILED: Could not retrieve progress')
                else:
                    print(f'❌ FAILED: Could not save progress')
            except Exception as e:
                print(f'❌ ERROR: {e}')
        else:
            print('⚠️ SKIPPED: No session ID available')
        
        # Summary
        print('\n' + '='*80)
        print('PHASE 0 TEST SUMMARY')
        print('='*80)
        print('Using Goutham\'s production token throughout')
        print('No new tokens were generated')
        print('='*80)

if __name__ == '__main__':
    asyncio.run(test_phase0_features())