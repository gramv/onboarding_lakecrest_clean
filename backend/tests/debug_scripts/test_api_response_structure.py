#!/usr/bin/env python3
"""
Test API Response Structure for Health Insurance PDF Generation
"""

import requests
import json

def test_api_response_structure():
    """Test the actual API response structure"""
    
    backend_url = "http://localhost:8000"
    
    # Test data similar to what the frontend sends
    test_data = {
        "employee_data": {
            "personalInfo": {
                "firstName": "Goutham",
                "lastName": "Vemula",
                "ssn": "090-90-9090",
                "email": "goutham@example.com",
                "dateOfBirth": "1998-05-18",
                "address": "403 - 126 Corbin Ave",
                "city": "jersey city",
                "state": "NJ",
                "zipCode": "07302",
                "phone": "123-456-7890"
            },
            "medicalPlan": "hra6k",
            "medicalTier": "employee",
            "medicalWaived": False,
            "dentalCoverage": True,
            "dentalEnrolled": True,
            "dentalTier": "employee",
            "dentalWaived": False,
            "visionCoverage": False,
            "visionEnrolled": False,
            "visionTier": "employee",
            "visionWaived": False,
            "section125Acknowledged": True,
            "dependents": [],
            "hasStepchildren": False,
            "stepchildrenNames": "",
            "dependentsSupported": False,
            "irsDependentConfirmation": False,
            "isWaived": False,
            "waiveReason": "",
            "otherCoverageDetails": ""
        }
    }
    
    print("🔍 Testing API Response Structure")
    print("=" * 50)
    
    try:
        response = requests.post(
            f"{backend_url}/api/onboarding/response-structure-test/health-insurance/generate-pdf",
            json=test_data,
            timeout=30
        )
        
        print(f"HTTP Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            result = response.json()
            
            print("\n📋 Response Structure Analysis:")
            print(f"  - Root keys: {list(result.keys())}")
            print(f"  - Success: {result.get('success')}")
            print(f"  - Has 'data' key: {'data' in result}")
            
            if 'data' in result:
                data = result['data']
                print(f"  - Data type: {type(data)}")
                print(f"  - Data keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                
                if isinstance(data, dict) and 'pdf' in data:
                    pdf_data = data['pdf']
                    print(f"  - PDF data type: {type(pdf_data)}")
                    print(f"  - PDF data length: {len(pdf_data) if isinstance(pdf_data, str) else 'Not a string'}")
                    
                    # Check if it's valid base64
                    if isinstance(pdf_data, str):
                        try:
                            import base64
                            decoded = base64.b64decode(pdf_data)
                            print(f"  - PDF base64 valid: ✅ Yes ({len(decoded)} bytes)")
                            
                            # Check PDF header
                            if decoded.startswith(b'%PDF'):
                                print(f"  - PDF header valid: ✅ Yes")
                            else:
                                print(f"  - PDF header valid: ❌ No (starts with: {decoded[:10]})")
                                
                        except Exception as e:
                            print(f"  - PDF base64 valid: ❌ No ({e})")
                else:
                    print(f"  - PDF key missing in data")
            else:
                print(f"  - No 'data' key in response")
            
            print(f"\n📄 Full Response Structure:")
            # Print first 500 chars of response for debugging
            response_str = json.dumps(result, indent=2)
            if len(response_str) > 500:
                print(response_str[:500] + "... (truncated)")
            else:
                print(response_str)
                
        else:
            print(f"❌ API Error: HTTP {response.status_code}")
            print(f"Response: {response.text[:500]}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    test_api_response_structure()
