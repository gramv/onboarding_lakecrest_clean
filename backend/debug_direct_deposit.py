#!/usr/bin/env python3
"""
Debug script for Direct Deposit PDF generation
"""

import sys
import os
import json
import traceback
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def test_direct_deposit_pdf():
    """Test direct deposit PDF generation with sample data"""
    
    print("🔍 Testing Direct Deposit PDF Generation...")
    print("=" * 60)
    
    # Test data that matches what the frontend sends
    test_data = {
        "firstName": "John",
        "lastName": "Doe", 
        "email": "john.doe@example.com",
        "ssn": "123-45-6789",
        "paymentMethod": "direct_deposit",
        "depositType": "full",
        "primaryAccount": {
            "bankName": "Test Bank",
            "accountType": "checking",
            "routingNumber": "123456789",
            "accountNumber": "9876543210",
            "depositAmount": "",
            "percentage": 100
        },
        "additionalAccounts": [],
        "signatureData": None
    }
    
    print("📋 Test Data:")
    print(json.dumps(test_data, indent=2))
    print()
    
    try:
        # Import the PDF form filler
        from pdf_forms import PDFFormFiller
        
        print("✅ PDFFormFiller imported successfully")
        
        # Create PDF filler instance
        pdf_filler = PDFFormFiller()
        print("✅ PDFFormFiller instance created")
        
        # Check if template file exists
        template_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "static",
            "direct-deposit-template.pdf"
        )
        
        print(f"📁 Template path: {template_path}")
        print(f"📁 Template exists: {os.path.exists(template_path)}")
        
        if not os.path.exists(template_path):
            print("❌ Template file not found!")
            return False
            
        # Test PDF generation
        print("\n🔄 Generating PDF...")
        pdf_bytes = pdf_filler.fill_direct_deposit_form(test_data)
        
        if pdf_bytes:
            print(f"✅ PDF generated successfully! Size: {len(pdf_bytes)} bytes")
            
            # Save test PDF
            output_path = "test_direct_deposit_output.pdf"
            with open(output_path, 'wb') as f:
                f.write(pdf_bytes)
            print(f"💾 Test PDF saved as: {output_path}")
            
            return True
        else:
            print("❌ PDF generation returned empty bytes")
            return False
            
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print("   Make sure you're running from the correct directory")
        return False
        
    except Exception as e:
        print(f"❌ Error during PDF generation: {e}")
        print("\n🔍 Full traceback:")
        traceback.print_exc()
        return False

def test_personal_info_processing():
    """Test the personal info data processing logic"""
    
    print("\n🔍 Testing Personal Info Data Processing...")
    print("=" * 60)
    
    # Test different data structures that might come from frontend
    test_cases = [
        {
            "name": "Direct structure",
            "data": {
                "firstName": "Jane",
                "lastName": "Smith",
                "email": "jane@example.com",
                "ssn": "987-65-4321"
            }
        },
        {
            "name": "Nested in formData",
            "data": {
                "formData": {
                    "firstName": "Bob",
                    "lastName": "Johnson",
                    "email": "bob@example.com",
                    "ssn": "555-12-3456"
                }
            }
        },
        {
            "name": "Mixed structure",
            "data": {
                "firstName": "Alice",
                "lastName": "Brown",
                "formData": {
                    "email": "alice@example.com",
                    "ssn": "111-22-3333"
                }
            }
        }
    ]
    
    for test_case in test_cases:
        print(f"\n📋 Testing: {test_case['name']}")
        data = test_case['data']
        
        # Extract names using the same logic as the endpoint
        if data.get("firstName") or data.get("lastName"):
            first_name = data.get("firstName", "")
            last_name = data.get("lastName", "")
            print(f"   ✅ Names from root: {first_name} {last_name}")
        else:
            # Try formData
            form_data = data.get("formData", {})
            first_name = form_data.get("firstName", "Unknown")
            last_name = form_data.get("lastName", "Employee")
            print(f"   ✅ Names from formData: {first_name} {last_name}")
        
        # Extract email and SSN
        email = data.get("email") or data.get("formData", {}).get("email", "")
        ssn = data.get("ssn") or data.get("formData", {}).get("ssn", "")
        
        print(f"   📧 Email: {email}")
        print(f"   🔢 SSN: {ssn}")

if __name__ == "__main__":
    print("🚀 Direct Deposit PDF Debug Script")
    print("=" * 60)
    
    # Test personal info processing
    test_personal_info_processing()
    
    # Test PDF generation
    success = test_direct_deposit_pdf()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed. Check the output above for details.")
