#!/usr/bin/env python3
"""
Test Direct Deposit PDF generation to verify fields are filled
"""
import base64
import requests
import json

def test_direct_deposit_pdf():
    url = "http://localhost:8000/api/onboarding/test-employee/direct-deposit/generate-pdf"
    
    # Test data with all required fields
    test_data = {
        "employee_data": {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john.doe@example.com",
            "ssn": "123-45-6789",
            "paymentMethod": "directDeposit",
            "primaryAccount": {
                "bankName": "Chase Bank, New York, NY",
                "accountType": "checking",
                "routingNumber": "021000021",
                "accountNumber": "1234567890"
            },
            "secondaryAccount": {
                "bankName": "Bank of America, Los Angeles, CA",
                "accountType": "savings",
                "routingNumber": "026009593",
                "accountNumber": "9876543210",
                "depositAmount": "500.00"
            }
        }
    }
    
    print("\n" + "="*60)
    print("Testing Direct Deposit PDF Generation")
    print("="*60)
    
    print("\n📋 Sending test data:")
    print(f"  Employee: {test_data['employee_data']['firstName']} {test_data['employee_data']['lastName']}")
    print(f"  Email: {test_data['employee_data']['email']}")
    print(f"  Primary Bank: {test_data['employee_data']['primaryAccount']['bankName']}")
    print(f"  Account Type: {test_data['employee_data']['primaryAccount']['accountType']}")
    
    # Make the request
    response = requests.post(url, json=test_data)
    
    if response.status_code == 200:
        result = response.json()
        if result.get('success') and result.get('data', {}).get('pdf'):
            # Save the PDF
            pdf_base64 = result['data']['pdf']
            pdf_bytes = base64.b64decode(pdf_base64)
            
            output_file = "test_direct_deposit_output.pdf"
            with open(output_file, 'wb') as f:
                f.write(pdf_bytes)
            
            print(f"\n✅ PDF generated successfully!")
            print(f"📄 Saved to: {output_file}")
            print(f"📊 PDF size: {len(pdf_bytes)} bytes")
            
            # Now check if fields are visible using PyMuPDF
            import fitz
            doc = fitz.open(output_file)
            page = doc[0]
            
            print("\n🔍 Checking filled fields:")
            fields_found = 0
            for widget in page.widgets():
                if widget.field_value and widget.field_value not in ["Off", ""]:
                    print(f"  ✓ {widget.field_name}: {widget.field_value}")
                    fields_found += 1
            
            if fields_found == 0:
                print("  ⚠️ No filled fields found - checking text content...")
                text = page.get_text()
                if "John Doe" in text:
                    print("  ✓ Name appears in PDF text")
                if "Chase Bank" in text:
                    print("  ✓ Bank name appears in PDF text")
                if "021000021" in text:
                    print("  ✓ Routing number appears in PDF text")
            
            doc.close()
            
            print(f"\n✨ Total filled fields found: {fields_found}")
            return True
        else:
            print(f"\n❌ API returned success but no PDF data")
            return False
    else:
        print(f"\n❌ Request failed with status: {response.status_code}")
        print(f"Response: {response.text}")
        return False

if __name__ == "__main__":
    test_direct_deposit_pdf()