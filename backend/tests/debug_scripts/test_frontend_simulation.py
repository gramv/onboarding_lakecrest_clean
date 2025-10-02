#!/usr/bin/env python3
"""
Simulate Frontend API Call to Debug Response Structure Issue
"""

import requests
import json

def simulate_frontend_call():
    """Simulate the exact call the frontend makes"""
    
    backend_url = "http://localhost:8000"
    
    # This is the exact payload structure the frontend sends based on the logs
    frontend_payload = {
        "employee_data": {
            "hasSSN": True,
            "ssn": "090****",
            "hasPersonalInfo": True,
            "firstName": "Goutham",
            "lastName": "Vemula",
            "middleInitial": "G",
            "dateOfBirth": "1998-05-18",
            "address": "403 - 126 Corbin Ave",
            "city": "jersey city",
            "state": "NJ",
            "zipCode": "07302",
            "phone": "123-456-7890",
            "email": "goutham@example.com",
            "gender": "M",
            "maritalStatus": "single",
            "aptNumber": "",
            "preferredName": "",
            "medicalPlan": "hra6k",
            "medicalTier": "employee",
            "medicalCost": 59.91,
            "medicalWaived": False,
            "dentalCoverage": True,
            "dentalEnrolled": True,
            "dentalTier": "employee",
            "dentalCost": 13.68,
            "dentalWaived": False,
            "visionCoverage": False,
            "visionEnrolled": False,
            "visionTier": "employee",
            "visionCost": 0,
            "visionWaived": False,
            "dependents": [],
            "hasStepchildren": False,
            "stepchildrenNames": "",
            "dependentsSupported": False,
            "irsDependentConfirmation": False,
            "section125Acknowledgment": True,
            "section125Acknowledged": True,
            "effectiveDate": None,
            "totalBiweeklyCost": 73.59,
            "totalMonthlyCost": 159.44,
            "totalAnnualCost": 1913.34,
            "isWaived": False,
            "waiveReason": "",
            "otherCoverageType": "",
            "otherCoverageDetails": "",
            "personalInfo": {
                "firstName": "Goutham",
                "lastName": "Vemula",
                "middleInitial": "G",
                "ssn": "090-90-9090",
                "dateOfBirth": "1998-05-18",
                "address": "403 - 126 Corbin Ave",
                "city": "jersey city",
                "state": "NJ",
                "zipCode": "07302",
                "phone": "123-456-7890",
                "email": "goutham@example.com",
                "gender": "M",
                "maritalStatus": "single",
                "aptNumber": "",
                "preferredName": ""
            }
        }
    }
    
    print("🔍 Simulating Frontend API Call")
    print("=" * 50)
    
    try:
        # Use the same headers the frontend would use
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        response = requests.post(
            f"{backend_url}/api/onboarding/frontend-simulation/health-insurance/generate-pdf",
            json=frontend_payload,
            headers=headers,
            timeout=30
        )
        
        print(f"HTTP Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('content-type')}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                
                print("\n📋 Response Analysis:")
                print(f"  - Response type: {type(result)}")
                print(f"  - Root keys: {list(result.keys())}")
                print(f"  - Success: {result.get('success')}")
                
                # Check the exact path the frontend uses
                print(f"\n🎯 Frontend Path Analysis:")
                print(f"  - response.data exists: {'data' in result}")
                
                if 'data' in result:
                    data = result['data']
                    print(f"  - response.data type: {type(data)}")
                    print(f"  - response.data keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                    
                    if isinstance(data, dict):
                        print(f"  - response.data.pdf exists: {'pdf' in data}")
                        if 'pdf' in data:
                            pdf = data['pdf']
                            print(f"  - response.data.pdf type: {type(pdf)}")
                            print(f"  - response.data.pdf length: {len(pdf) if isinstance(pdf, str) else 'Not a string'}")
                            
                            # This is what the frontend tries to access
                            print(f"\n✅ Frontend access path 'response.data.data.pdf' would be:")
                            print(f"  - Available: {'pdf' in data}")
                            print(f"  - Value type: {type(pdf) if 'pdf' in data else 'N/A'}")
                        else:
                            print(f"  - ❌ response.data.pdf does NOT exist")
                    else:
                        print(f"  - ❌ response.data is not a dict")
                else:
                    print(f"  - ❌ response.data does NOT exist")
                
                # Show what the frontend error would be
                try:
                    # This is the exact line from the frontend
                    pdf_base64 = result['data']['pdf']  # This should work
                    print(f"\n✅ SUCCESS: PDF extraction successful")
                    print(f"  - PDF length: {len(pdf_base64)}")
                except KeyError as e:
                    print(f"\n❌ ERROR: PDF extraction failed - {e}")
                    print(f"  - This matches the frontend error!")
                except Exception as e:
                    print(f"\n❌ ERROR: Unexpected error - {e}")
                    
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                print(f"Raw response: {response.text[:500]}")
        else:
            print(f"❌ HTTP Error: {response.status_code}")
            print(f"Response: {response.text[:500]}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    simulate_frontend_call()
