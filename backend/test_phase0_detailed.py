#!/usr/bin/env python3
"""
Detailed test of Phase 0 features with Goutham's production token
"""

import httpx
import asyncio
from datetime import datetime
import json

# Goutham's production token
PRODUCTION_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZV9pZCI6IjE5MzEwYTM2LTc5N2MtNDQ2NC05NDViLWE0YTA2YTVlMTdjMiIsImFwcGxpY2F0aW9uX2lkIjpudWxsLCJ0b2tlbl90eXBlIjoib25ib2FyZGluZyIsImlhdCI6MTc1NzgxMjIxNSwiZXhwIjoxNzU4MDcxNDE1LCJqdGkiOiJUZS1NdTBFcVJHRTEzaDd6VlYtVll3In0.gg1XPTd2oTFSd7bVVcXo_Tpd1GISJYb4P51Yj_QVL2c"

EMPLOYEE_ID = "19310a36-797c-4464-945b-a4a06a5e17c2"
BASE_URL = 'http://localhost:8000'

async def test_phase0_detailed():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        print('\n' + '='*80)
        print('PHASE 0 DETAILED TEST WITH PRODUCTION TOKEN')
        print('='*80)
        
        # Test 1: Validate Token - Show full response
        print('\n✅ TEST 1: Token Validation (Detailed)')
        print('-'*40)
        try:
            response = await client.post(
                '/api/onboarding/validate-token',
                json={'token': PRODUCTION_TOKEN}
            )
            print(f'Status: {response.status_code}')
            
            if response.status_code == 200:
                data = response.json()
                print(f'✅ SUCCESS: Token validated')
                print('\nFull Response:')
                print(json.dumps(data, indent=2))
                
                # Extract session ID if available
                session_id = None
                if data.get('data', {}).get('session'):
                    session_id = data['data']['session'].get('id')
                    print(f'\n📌 Session ID: {session_id}')
                elif data.get('session_id'):
                    session_id = data.get('session_id')
                    print(f'\n📌 Session ID: {session_id}')
                else:
                    print('\n⚠️ No session ID in response')
                
                # If we have a session ID, test locking
                if session_id:
                    print('\n✅ TEST 2: Session Locking')
                    print('-'*40)
                    
                    # Acquire lock - with correct parameters
                    lock_response = await client.post(
                        '/api/onboarding/session/lock',
                        json={
                            'session_id': session_id,
                            'lock_type': 'write',
                            'duration_seconds': 300,
                            'token': PRODUCTION_TOKEN
                        }
                    )
                    print(f'Lock acquire status: {lock_response.status_code}')
                    
                    if lock_response.status_code == 200:
                        lock_data = lock_response.json()
                        print('Lock response:')
                        print(json.dumps(lock_data, indent=2))
                        
                        lock_token = lock_data.get('data', {}).get('lock_token') or lock_data.get('lock_token')
                        if lock_token:
                            print(f'\n📌 Lock Token: {lock_token[:30]}...')
                            
                            # Try duplicate lock - with correct parameters
                            dup_response = await client.post(
                                '/api/onboarding/session/lock',
                                json={
                                    'session_id': session_id,
                                    'lock_type': 'write',
                                    'duration_seconds': 300,
                                    'token': PRODUCTION_TOKEN
                                }
                            )
                            print(f'\nDuplicate lock attempt status: {dup_response.status_code}')
                            if dup_response.status_code != 200:
                                print('✅ Duplicate lock prevented (expected)')
                            
                            # Note: No release endpoint exists - locks expire automatically
                            print('\n📝 Note: Locks expire automatically after duration')
                    else:
                        print(f'Lock error: {lock_response.text[:200]}')
                    
                    # Test progress saving
                    print('\n✅ TEST 3: Progress Saving')
                    print('-'*40)
                    
                    save_response = await client.post(
                        '/api/onboarding/save-progress',
                        json={
                            'employee_id': EMPLOYEE_ID,
                            'step_id': 'personal_info',
                            'data': {
                                'firstName': 'Goutham',
                                'lastName': 'Vemula',
                                'email': 'vgoutamram@gmail.com'
                            },
                            'token': PRODUCTION_TOKEN
                        }
                    )
                    print(f'Save progress status: {save_response.status_code}')
                    
                    if save_response.status_code == 200:
                        print('✅ Progress saved successfully')
                        
                        # Retrieve progress
                        get_response = await client.get(
                            f'/api/onboarding/{session_id}/progress',
                            params={'token': PRODUCTION_TOKEN}
                        )
                        print(f'\nRetrieve progress status: {get_response.status_code}')
                        
                        if get_response.status_code == 200:
                            progress_data = get_response.json()
                            print('Progress data retrieved:')
                            print(json.dumps(progress_data, indent=2))
                    else:
                        print(f'Save error: {save_response.text[:200]}')
                
                else:
                    # Try to create a session
                    print('\n🔧 Attempting to create session...')
                    print('-'*40)
                    
                    # Try different endpoints that might create a session
                    welcome_response = await client.get(
                        f'/api/onboarding/welcome/{PRODUCTION_TOKEN}'
                    )
                    print(f'Welcome endpoint status: {welcome_response.status_code}')
                    
                    if welcome_response.status_code == 200:
                        welcome_data = welcome_response.json()
                        if welcome_data.get('data', {}).get('session'):
                            session_id = welcome_data['data']['session'].get('id')
                            print(f'✅ Session created via welcome endpoint!')
                            print(f'📌 Session ID: {session_id}')
                        else:
                            print('⚠️ Welcome endpoint didn\'t create session')
                    
            else:
                print(f'❌ Token validation failed: {response.text[:200]}')
                
        except Exception as e:
            print(f'❌ Error: {e}')

if __name__ == '__main__':
    asyncio.run(test_phase0_detailed())