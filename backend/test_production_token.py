#!/usr/bin/env python3
"""
Test Phase 0 implementation with production token from clickwise.in
"""

import httpx
import asyncio
from datetime import datetime
import json
import jwt

# Production token from clickwise.in
PRODUCTION_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZV9pZCI6IjE5MzEwYTM2LTc5N2MtNDQ2NC05NDViLWE0YTA2YTVlMTdjMiIsImFwcGxpY2F0aW9uX2lkIjpudWxsLCJ0b2tlbl90eXBlIjoib25ib2FyZGluZyIsImlhdCI6MTc1NzgxMjIxNSwiZXhwIjoxNzU4MDcxNDE1LCJqdGkiOiJUZS1NdTBFcVJHRTEzaDd6VlYtVll3In0.gg1XPTd2oTFSd7bVVcXo_Tpd1GISJYb4P51Yj_QVL2c"

# Decode token to get details
decoded = jwt.decode(PRODUCTION_TOKEN, options={"verify_signature": False})
EMPLOYEE_ID = decoded['employee_id']

BASE_URL = 'http://localhost:8000'

async def test_phase0_with_production_token():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        print('\n' + '='*80)
        print('PHASE 0 TEST WITH PRODUCTION TOKEN')
        print('='*80)
        print(f'Test Started: {datetime.now().isoformat()}')
        print(f'Employee ID: {EMPLOYEE_ID}')
        print(f'Token JTI: {decoded["jti"]}')
        print(f'Expires: {datetime.fromtimestamp(decoded["exp"]).isoformat()}')
        
        results = {}
        
        # Test 1: Welcome endpoint (existing)
        print('\n1️⃣ Testing Welcome Endpoint...')
        try:
            response = await client.get(f'/api/onboarding/welcome/{PRODUCTION_TOKEN}')
            results['welcome_endpoint'] = {
                'status': response.status_code,
                'success': response.status_code == 200,
                'data': response.json() if response.status_code == 200 else response.text
            }
            print(f'   Status: {response.status_code}')
            if response.status_code == 200:
                print('   ✅ Employee data retrieved')
            else:
                print(f'   ❌ Failed: {response.text[:200]}')
        except Exception as e:
            print(f'   ❌ Error: {e}')
            results['welcome_endpoint'] = {'error': str(e)}
        
        # Test 2: Session endpoint (existing)
        print('\n2️⃣ Testing Session Endpoint...')
        try:
            response = await client.get(f'/api/onboarding/session/{PRODUCTION_TOKEN}')
            results['session_endpoint'] = {
                'status': response.status_code,
                'success': response.status_code == 200
            }
            print(f'   Status: {response.status_code}')
            if response.status_code == 200:
                data = response.json()
                print(f'   ✅ Session retrieved')
                print(f'   Employee: {data.get("first_name")} {data.get("last_name")}')
            else:
                print(f'   ❌ Failed')
        except Exception as e:
            print(f'   ❌ Error: {e}')
            results['session_endpoint'] = {'error': str(e)}
        
        # Test 3: Check for Phase 0 endpoints
        print('\n3️⃣ Testing Phase 0 Endpoints...')
        
        # Test token validation (Phase 0)
        print('\n   Testing Token Validation...')
        try:
            response = await client.post('/api/onboarding/validate-token', 
                                        json={'token': PRODUCTION_TOKEN})
            results['validate_token'] = {
                'status': response.status_code,
                'exists': response.status_code != 405
            }
            print(f'   Status: {response.status_code}')
            if response.status_code == 405:
                print('   ⚠️ Endpoint not implemented (405 Method Not Allowed)')
            elif response.status_code == 200:
                print('   ✅ Token validation works!')
            else:
                print(f'   ❌ Unexpected status: {response.status_code}')
        except Exception as e:
            print(f'   ❌ Error: {e}')
        
        # Test token refresh (Phase 0)
        print('\n   Testing Token Refresh...')
        try:
            response = await client.post('/api/onboarding/refresh-token',
                                        json={'token': PRODUCTION_TOKEN})
            results['refresh_token'] = {
                'status': response.status_code,
                'exists': response.status_code != 405
            }
            print(f'   Status: {response.status_code}')
            if response.status_code == 405:
                print('   ⚠️ Endpoint not implemented (405 Method Not Allowed)')
            elif response.status_code == 200:
                print('   ✅ Token refresh works!')
            else:
                print(f'   ❌ Unexpected status: {response.status_code}')
        except Exception as e:
            print(f'   ❌ Error: {e}')
        
        # Test session locking (Phase 0)
        print('\n   Testing Session Locking...')
        try:
            response = await client.post('/api/onboarding/session/lock',
                                        json={
                                            'token': PRODUCTION_TOKEN,
                                            'action': 'acquire',
                                            'step_id': 'personal_info'
                                        })
            results['session_lock'] = {
                'status': response.status_code,
                'exists': response.status_code != 405
            }
            print(f'   Status: {response.status_code}')
            if response.status_code == 405:
                print('   ⚠️ Endpoint not implemented (405 Method Not Allowed)')
            elif response.status_code == 200:
                print('   ✅ Session locking works!')
            else:
                print(f'   ❌ Unexpected status: {response.status_code}')
        except Exception as e:
            print(f'   ❌ Error: {e}')
        
        # Test 4: Check existing form data
        print('\n4️⃣ Testing Form Data Retrieval...')
        try:
            # Try I-9 Section 1
            response = await client.get(f'/api/onboarding/{EMPLOYEE_ID}/i9-section1')
            results['i9_section1'] = {
                'status': response.status_code,
                'has_data': response.status_code == 200
            }
            print(f'   I-9 Section 1: {response.status_code}')
            if response.status_code == 200:
                data = response.json()
                if data:
                    print(f'   ✅ Has saved I-9 data')
                else:
                    print(f'   ⚠️ No I-9 data saved yet')
        except Exception as e:
            print(f'   ❌ Error: {e}')
        
        # Test 5: Check authentication middleware
        print('\n5️⃣ Testing Authentication Middleware...')
        try:
            # Test an endpoint that requires authentication
            headers = {'Authorization': f'Bearer {PRODUCTION_TOKEN}'}
            response = await client.get('/api/properties', headers=headers)
            results['auth_middleware'] = {
                'status': response.status_code,
                'works': response.status_code != 500
            }
            print(f'   Status: {response.status_code}')
            if response.status_code == 500:
                print('   ❌ Authentication middleware has bugs (500 error)')
            elif response.status_code in [200, 401, 403]:
                print(f'   ✅ Authentication middleware works (status: {response.status_code})')
            else:
                print(f'   ⚠️ Unexpected status: {response.status_code}')
        except Exception as e:
            print(f'   ❌ Error: {e}')
        
        # Summary
        print('\n' + '='*80)
        print('TEST SUMMARY')
        print('='*80)
        
        working = []
        broken = []
        missing = []
        
        for endpoint, result in results.items():
            if 'error' in result:
                broken.append(endpoint)
            elif result.get('status') == 405 or result.get('exists') == False:
                missing.append(endpoint)
            elif result.get('success') or result.get('works'):
                working.append(endpoint)
            else:
                broken.append(endpoint)
        
        print(f'\n✅ Working: {len(working)}')
        for item in working:
            print(f'   - {item}')
        
        print(f'\n⚠️ Missing (Not Implemented): {len(missing)}')
        for item in missing:
            print(f'   - {item}')
        
        print(f'\n❌ Broken: {len(broken)}')
        for item in broken:
            print(f'   - {item}')
        
        # Save results
        with open('phase0_production_test_results.json', 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'token': PRODUCTION_TOKEN,
                'employee_id': EMPLOYEE_ID,
                'results': results,
                'summary': {
                    'working': working,
                    'missing': missing,
                    'broken': broken
                }
            }, f, indent=2, default=str)
        
        print(f'\n📄 Results saved to phase0_production_test_results.json')
        
        # Conclusion
        if len(missing) > 0:
            print('\n🔴 PHASE 0 STATUS: NOT IMPLEMENTED')
            print('The Phase 0 endpoints were never added to the application router.')
        elif len(broken) > 0:
            print('\n🟡 PHASE 0 STATUS: PARTIALLY WORKING')
            print('Some endpoints exist but have bugs.')
        else:
            print('\n🟢 PHASE 0 STATUS: FULLY WORKING')
            print('All Phase 0 features are operational.')

if __name__ == '__main__':
    asyncio.run(test_phase0_with_production_token())