#!/usr/bin/env python3
"""
Test PDF Generation Fix
Verify that the API consistently returns the correct response structure
"""

import requests
import json
import time
import concurrent.futures

def test_single_pdf_generation():
    """Test a single PDF generation"""
    
    backend_url = "http://localhost:8000"
    
    test_data = {
        "employee_data": {
            "personalInfo": {
                "firstName": "Fix",
                "lastName": "Test",
                "ssn": "090-90-9090",
                "email": "fix@example.com"
            },
            "medicalPlan": "hra6k",
            "medicalTier": "employee",
            "section125Acknowledged": True
        }
    }
    
    try:
        response = requests.post(
            f"{backend_url}/api/onboarding/fix-test/health-insurance/generate-pdf",
            json=test_data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Check the exact structure the frontend expects
            success = result.get('success', False)
            has_data = 'data' in result
            has_pdf = has_data and 'pdf' in result['data']
            pdf_valid = has_pdf and isinstance(result['data']['pdf'], str) and len(result['data']['pdf']) > 1000
            
            return {
                'success': success and has_data and has_pdf and pdf_valid,
                'details': {
                    'http_status': response.status_code,
                    'api_success': success,
                    'has_data': has_data,
                    'has_pdf': has_pdf,
                    'pdf_length': len(result['data']['pdf']) if has_pdf else 0,
                    'pdf_valid': pdf_valid
                }
            }
        else:
            return {
                'success': False,
                'details': {
                    'http_status': response.status_code,
                    'error': response.text[:200]
                }
            }
            
    except Exception as e:
        return {
            'success': False,
            'details': {
                'error': str(e)
            }
        }

def test_concurrent_pdf_generation():
    """Test concurrent PDF generation to check for race conditions"""
    
    def make_request(request_id):
        return test_single_pdf_generation()
    
    # Run 5 concurrent requests
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(make_request, i) for i in range(5)]
        results = [future.result() for future in concurrent.futures.as_completed(futures)]
    
    return results

def main():
    print("🔧 Testing PDF Generation Fix")
    print("=" * 50)
    
    # Test 1: Single PDF generation
    print("\n1️⃣ Testing Single PDF Generation...")
    single_result = test_single_pdf_generation()
    
    if single_result['success']:
        print("✅ Single PDF generation: SUCCESS")
        print(f"   - PDF length: {single_result['details']['pdf_length']} chars")
    else:
        print("❌ Single PDF generation: FAILED")
        print(f"   - Details: {single_result['details']}")
    
    # Test 2: Concurrent PDF generation
    print("\n2️⃣ Testing Concurrent PDF Generation...")
    concurrent_results = test_concurrent_pdf_generation()
    
    success_count = sum(1 for r in concurrent_results if r['success'])
    total_count = len(concurrent_results)
    
    if success_count == total_count:
        print(f"✅ Concurrent PDF generation: SUCCESS ({success_count}/{total_count})")
    else:
        print(f"❌ Concurrent PDF generation: PARTIAL ({success_count}/{total_count})")
        
        # Show failed requests
        for i, result in enumerate(concurrent_results):
            if not result['success']:
                print(f"   - Request {i+1} failed: {result['details']}")
    
    # Test 3: Response structure validation
    print("\n3️⃣ Testing Response Structure...")
    test_result = test_single_pdf_generation()
    
    if test_result['success']:
        details = test_result['details']
        print("✅ Response structure validation: SUCCESS")
        print(f"   - HTTP Status: {details['http_status']}")
        print(f"   - API Success: {details['api_success']}")
        print(f"   - Has Data: {details['has_data']}")
        print(f"   - Has PDF: {details['has_pdf']}")
        print(f"   - PDF Valid: {details['pdf_valid']}")
    else:
        print("❌ Response structure validation: FAILED")
        print(f"   - Details: {test_result['details']}")
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    all_tests_passed = (
        single_result['success'] and 
        success_count == total_count and 
        test_result['success']
    )
    
    if all_tests_passed:
        print("🎉 ALL TESTS PASSED!")
        print("✅ PDF generation fix is working correctly")
        print("✅ Frontend should now work without errors")
    else:
        print("❌ SOME TESTS FAILED")
        print("⚠️ PDF generation fix needs more work")
    
    return all_tests_passed

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
