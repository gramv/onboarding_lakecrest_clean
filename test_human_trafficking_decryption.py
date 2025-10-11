#!/usr/bin/env python3
"""
Test script to verify Human Trafficking document decryption is working correctly
"""

import requests
import base64
import sys

# Configuration
API_BASE_URL = "http://localhost:8000"
EMPLOYEE_ID = "your-employee-id-here"  # Replace with actual employee ID
SESSION_TOKEN = "your-session-token-here"  # Replace with actual session token

def test_human_trafficking_decryption():
    """Test the Human Trafficking document endpoint"""
    
    print("=" * 80)
    print("Testing Human Trafficking Document Decryption")
    print("=" * 80)
    
    # Make API request
    url = f"{API_BASE_URL}/api/onboarding/{EMPLOYEE_ID}/documents/human-trafficking"
    params = {"token": SESSION_TOKEN}
    
    print(f"\n📡 Making request to: {url}")
    print(f"   Employee ID: {EMPLOYEE_ID}")
    
    try:
        response = requests.get(url, params=params)
        
        print(f"\n📊 Response Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Error: {response.text}")
            return False
        
        data = response.json()
        
        # Check response structure
        print("\n🔍 Checking response structure...")
        
        if not data.get('success'):
            print(f"❌ API returned success=false: {data.get('message')}")
            return False
        
        print("✅ API returned success=true")
        
        # Check for document
        if not data.get('data', {}).get('has_document'):
            print("❌ No document found for this employee")
            return False
        
        print("✅ Document found")
        
        # Check for pdf_data (decrypted)
        pdf_data = data.get('data', {}).get('pdf_data')
        if not pdf_data:
            print("❌ No pdf_data in response (decryption may have failed)")
            print(f"   Response keys: {list(data.get('data', {}).keys())}")
            return False
        
        print(f"✅ pdf_data present (length: {len(pdf_data)} characters)")
        
        # Validate base64
        try:
            decoded = base64.b64decode(pdf_data)
            print(f"✅ Valid base64 (decoded to {len(decoded)} bytes)")
        except Exception as e:
            print(f"❌ Invalid base64: {e}")
            return False
        
        # Check PDF header
        if decoded[:4] == b'%PDF':
            print("✅ Valid PDF header detected")
        else:
            print(f"❌ Invalid PDF header: {decoded[:10]}")
            return False
        
        # Check for document metadata
        metadata = data.get('data', {}).get('document_metadata', {})
        if metadata:
            print("\n📄 Document Metadata:")
            print(f"   Filename: {metadata.get('filename')}")
            print(f"   Signed at: {metadata.get('signed_at')}")
            print(f"   Bucket: {metadata.get('bucket')}")
            print(f"   Path: {metadata.get('path')}")
        
        # Save to file for manual inspection
        output_file = "test_human_trafficking_decrypted.pdf"
        with open(output_file, 'wb') as f:
            f.write(decoded)
        print(f"\n💾 Saved decrypted PDF to: {output_file}")
        print(f"   You can open this file to verify it's readable")
        
        print("\n" + "=" * 80)
        print("✅ ALL TESTS PASSED!")
        print("=" * 80)
        
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Request failed: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_comparison_with_other_documents():
    """Compare Human Trafficking with other document endpoints"""
    
    print("\n" + "=" * 80)
    print("Comparing with Other Document Endpoints")
    print("=" * 80)
    
    endpoints = [
        ("Company Policies", f"/api/onboarding/{EMPLOYEE_ID}/documents/company-policies"),
        ("I-9 Form", f"/api/onboarding/{EMPLOYEE_ID}/documents/i9-section1"),
        ("Direct Deposit", f"/api/onboarding/{EMPLOYEE_ID}/documents/direct-deposit"),
        ("Human Trafficking", f"/api/onboarding/{EMPLOYEE_ID}/documents/human-trafficking"),
    ]
    
    results = {}
    
    for name, endpoint in endpoints:
        url = f"{API_BASE_URL}{endpoint}"
        params = {"token": SESSION_TOKEN}
        
        print(f"\n📡 Testing {name}...")
        
        try:
            response = requests.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                has_pdf_data = bool(data.get('data', {}).get('pdf_data'))
                has_signed_url = bool(data.get('data', {}).get('document_metadata', {}).get('signed_url'))
                
                results[name] = {
                    'status': '✅',
                    'has_pdf_data': has_pdf_data,
                    'has_signed_url': has_signed_url
                }
                
                print(f"   Status: ✅ 200 OK")
                print(f"   Has pdf_data: {'✅' if has_pdf_data else '❌'}")
                print(f"   Has signed_url: {'✅' if has_signed_url else '❌'}")
            else:
                results[name] = {
                    'status': f'❌ {response.status_code}',
                    'has_pdf_data': False,
                    'has_signed_url': False
                }
                print(f"   Status: ❌ {response.status_code}")
                
        except Exception as e:
            results[name] = {
                'status': f'❌ Error',
                'has_pdf_data': False,
                'has_signed_url': False
            }
            print(f"   Error: {e}")
    
    # Summary table
    print("\n" + "=" * 80)
    print("Summary")
    print("=" * 80)
    print(f"{'Document':<20} {'Status':<15} {'pdf_data':<12} {'signed_url':<12}")
    print("-" * 80)
    
    for name, result in results.items():
        pdf_data_icon = '✅' if result['has_pdf_data'] else '❌'
        signed_url_icon = '✅' if result['has_signed_url'] else '❌'
        print(f"{name:<20} {result['status']:<15} {pdf_data_icon:<12} {signed_url_icon:<12}")
    
    # Check consistency
    all_have_pdf_data = all(r['has_pdf_data'] for r in results.values() if r['status'] == '✅')
    
    if all_have_pdf_data:
        print("\n✅ All documents consistently return pdf_data (decrypted)")
    else:
        print("\n⚠️  Inconsistent: Some documents missing pdf_data")


if __name__ == "__main__":
    print("\n🧪 Human Trafficking Document Decryption Test Suite\n")
    
    # Check if employee ID and token are set
    if EMPLOYEE_ID == "your-employee-id-here" or SESSION_TOKEN == "your-session-token-here":
        print("❌ Please update EMPLOYEE_ID and SESSION_TOKEN in the script")
        print("\nTo get these values:")
        print("1. Open browser DevTools (F12)")
        print("2. Go to Application/Storage → Local Storage")
        print("3. Find 'employee' and 'sessionToken' keys")
        print("4. Update the script with these values")
        sys.exit(1)
    
    # Run tests
    success = test_human_trafficking_decryption()
    
    if success:
        print("\n" + "=" * 80)
        print("Running comparison test...")
        test_comparison_with_other_documents()
    
    sys.exit(0 if success else 1)

