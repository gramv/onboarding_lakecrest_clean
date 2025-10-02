#!/usr/bin/env python3
"""
Test script for Human Trafficking Training Certificate System
"""
import requests
import json
import base64
from datetime import datetime

# API URL
API_URL = "http://localhost:8000"

def test_generate_certificate():
    """Test certificate generation endpoint"""
    print("\n=== Testing Certificate Generation ===\n")
    
    # Prepare test data
    employee_data = {
        'id': 'EMP-TEST-001',
        'name': 'John Doe',
        'property_id': 'PROP-001',
        'property_name': 'Grand Hotel & Resort',
        'position': 'Front Desk Agent'
    }
    
    signature_data = {
        'name': 'John Doe',
        'timestamp': datetime.now().isoformat(),
        'ipAddress': '192.168.1.1'
    }
    
    payload = {
        'employee_data': employee_data,
        'signature_data': signature_data,
        'training_date': '08/27/2025'
    }
    
    try:
        response = requests.post(
            f"{API_URL}/api/certificates/trafficking/generate",
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                cert_data = data['data']
                print("✅ Certificate generated successfully!")
                print(f"   Certificate ID: {cert_data['certificate_id']}")
                print(f"   Filename: {cert_data['filename']}")
                print(f"   Issue Date: {cert_data['issue_date']}")
                print(f"   Expiry Date: {cert_data['expiry_date']}")
                
                # Save PDF for inspection
                if cert_data.get('pdf'):
                    pdf_bytes = base64.b64decode(cert_data['pdf'])
                    with open('test_api_certificate.pdf', 'wb') as f:
                        f.write(pdf_bytes)
                    print("   PDF saved as: test_api_certificate.pdf")
                
                return cert_data['certificate_id']
            else:
                print(f"❌ Generation failed: {data.get('message')}")
        else:
            print(f"❌ HTTP Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    
    return None

def test_get_certificates(employee_id):
    """Test getting certificates for an employee"""
    print(f"\n=== Testing Get Certificates for Employee {employee_id} ===\n")
    
    try:
        response = requests.get(
            f"{API_URL}/api/certificates/trafficking/{employee_id}",
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                certificates = data['data']['certificates']
                print(f"✅ Retrieved {len(certificates)} certificate(s)")
                
                for cert in certificates:
                    print(f"\n   Certificate: {cert['certificate_id']}")
                    print(f"   Employee: {cert['employee_name']}")
                    print(f"   Property: {cert['property_name']}")
                    print(f"   Issue Date: {cert['issue_date']}")
                    print(f"   Expiry Date: {cert['expiry_date']}")
                    
                    if cert.get('validity_status'):
                        validity = cert['validity_status']
                        if validity['valid']:
                            print(f"   Status: ✅ Valid ({validity['days_until_expiry']} days until expiry)")
                        else:
                            print(f"   Status: ❌ Expired")
            else:
                print(f"❌ Failed: {data.get('message')}")
        else:
            print(f"❌ HTTP Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_verify_certificate(certificate_id):
    """Test certificate verification"""
    print(f"\n=== Testing Certificate Verification for {certificate_id} ===\n")
    
    try:
        response = requests.get(
            f"{API_URL}/api/certificates/trafficking/verify/{certificate_id}",
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                cert_info = data['data']
                validity = cert_info['validity']
                
                print(f"✅ Certificate verified:")
                print(f"   Certificate ID: {cert_info['certificate_id']}")
                print(f"   Employee: {cert_info['employee_name']}")
                print(f"   Property: {cert_info['property_name']}")
                print(f"   Issue Date: {cert_info['issue_date']}")
                print(f"   Expiry Date: {cert_info['expiry_date']}")
                
                if validity['valid']:
                    print(f"   Status: ✅ VALID")
                    print(f"   Days until expiry: {validity['days_until_expiry']}")
                else:
                    print(f"   Status: ❌ EXPIRED")
            else:
                print(f"❌ Failed: {data.get('message')}")
        else:
            print(f"❌ HTTP Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_expiring_certificates():
    """Test getting expiring certificates"""
    print("\n=== Testing Get Expiring Certificates ===\n")
    
    try:
        response = requests.get(
            f"{API_URL}/api/certificates/expiring",
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                certificates = data['data']['expiring_certificates']
                print(f"✅ Found {len(certificates)} expiring certificate(s)")
                
                for cert in certificates:
                    print(f"\n   Certificate: {cert['certificate_id']}")
                    print(f"   Employee: {cert['employee_name']}")
                    print(f"   Days until expiry: {cert.get('days_until_expiry', 'N/A')}")
            else:
                print(f"❌ Failed: {data.get('message')}")
        else:
            print(f"❌ HTTP Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def main():
    """Run all tests"""
    print("""
╔════════════════════════════════════════════════════╗
║   Human Trafficking Certificate System Test Suite  ║
╚════════════════════════════════════════════════════╝
    """)
    
    # Check if server is running
    try:
        response = requests.get(f"{API_URL}/healthz", timeout=2)
        if response.status_code != 200:
            print("❌ Server is not responding. Please start the backend server first.")
            return
    except:
        print("❌ Cannot connect to backend server at", API_URL)
        print("   Please run: python3 -m uvicorn app.main_enhanced:app --reload")
        return
    
    print("✅ Backend server is running\n")
    
    # Run tests
    certificate_id = test_generate_certificate()
    
    if certificate_id:
        test_get_certificates('EMP-TEST-001')
        test_verify_certificate(certificate_id)
    
    test_expiring_certificates()
    
    print("""
╔════════════════════════════════════════════════════╗
║            Test Suite Complete                     ║
╚════════════════════════════════════════════════════╝
    """)

if __name__ == "__main__":
    main()