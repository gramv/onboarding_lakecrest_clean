#!/usr/bin/env python3
"""
Debug script to simulate the actual frontend data flow to Direct Deposit PDF generation
"""
import json
import sys
import os
import requests

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

def test_actual_frontend_data_flow():
    """Test with data that mimics actual frontend session storage"""

    print("=== TESTING ACTUAL FRONTEND DATA FLOW ===")

    # Simulate what might be in sessionStorage for direct-deposit step
    frontend_session_data = {
        "formData": {
            "paymentMethod": "direct_deposit",
            "depositType": "full",
            "primaryAccount": {
                "bankName": "Chase Bank",
                "routingNumber": "021000021",
                "accountNumber": "9876543210",
                "accountType": "checking",
                "depositAmount": "",
                "percentage": 100
            },
            "additionalAccounts": [],
            "voidedCheckUploaded": False,
            "bankLetterUploaded": False,
            "totalPercentage": 100,
            "authorizeDeposit": False,
            "employeeSignature": "",
            "dateOfAuth": "2025-01-27"
        },
        "isValid": True,
        "isSigned": False,
        "showReview": True
    }

    # Simulate what might be in sessionStorage for personal-info step (with SSN)
    personal_info_data = {
        "personalInfo": {
            "firstName": "Jane",
            "lastName": "Smith",
            "email": "jane.smith@email.com",
            "phone": "555-123-4567",
            "ssn": "123-45-6789"
        }
    }

    print("Frontend Session Data (Direct Deposit):")
    print(json.dumps(frontend_session_data, indent=2))

    print("\nFrontend Session Data (Personal Info):")
    print(json.dumps(personal_info_data, indent=2))

    # Simulate what DirectDepositStep.tsx sends to ReviewAndSign
    extra_pdf_data = {
        "firstName": personal_info_data["personalInfo"]["firstName"],
        "lastName": personal_info_data["personalInfo"]["lastName"],
        "email": personal_info_data["personalInfo"]["email"],
        "ssn": personal_info_data["personalInfo"]["ssn"]
    }

    print("\nExtra PDF Data (from DirectDepositStep.tsx):")
    print(json.dumps(extra_pdf_data, indent=2))

    # Simulate what ReviewAndSign sends to backend
    backend_payload = {
        "employee_data": {
            **frontend_session_data["formData"],  # This includes primaryAccount
            **extra_pdf_data  # This includes firstName, lastName, email, ssn
        }
    }

    print("\nBackend Payload (what gets sent to /api/onboarding/{id}/direct-deposit/generate-pdf):")
    print(json.dumps(backend_payload, indent=2))

    # Now let's simulate what the backend does with this data
    from app.main_enhanced import get_employee_names_from_personal_info

    # Simulate the data processing in generate_direct_deposit_pdf
    employee_data_from_request = backend_payload["employee_data"]

    print(f"\n=== BACKEND DATA PROCESSING SIMULATION ===")
    print(f"Raw employee_data_from_request keys: {list(employee_data_from_request.keys())}")

    # Find primaryAccount data (this is what the backend does)
    primary_account = None

    # Path 1: Direct primaryAccount
    if "primaryAccount" in employee_data_from_request:
        primary_account = employee_data_from_request["primaryAccount"]
        print("✅ Found primaryAccount at root level")
    # Path 2: Nested in formData
    elif "formData" in employee_data_from_request and "primaryAccount" in employee_data_from_request["formData"]:
        primary_account = employee_data_from_request["formData"]["primaryAccount"]
        print("✅ Found primaryAccount nested in formData")
    else:
        primary_account = {}
        print("❌ Could not find primaryAccount data")

    print(f"Primary Account Data: {json.dumps(primary_account, indent=2)}")

    # Build the final data structure for PDF generation
    pdf_data = {
        "first_name": employee_data_from_request.get("firstName", ""),
        "last_name": employee_data_from_request.get("lastName", ""),
        "employee_id": "test-employee-123",
        "email": employee_data_from_request.get("email", ""),
        "ssn": employee_data_from_request.get("ssn", ""),
        "direct_deposit": {
            "bank_name": primary_account.get("bankName", ""),
            "account_type": primary_account.get("accountType", "checking"),
            "routing_number": primary_account.get("routingNumber", ""),
            "account_number": primary_account.get("accountNumber", ""),
            "deposit_type": employee_data_from_request.get("depositType", "full"),
            "deposit_amount": primary_account.get("depositAmount", ""),
        },
        "signatureData": employee_data_from_request.get("signatureData", ""),
        "property": {"name": "Test Property"},
    }

    print(f"\nFinal PDF Data Structure:")
    print(json.dumps(pdf_data, indent=2))

    # Test if this would generate a non-empty PDF
    try:
        from app.pdf_forms import PDFFormFiller
        pdf_filler = PDFFormFiller()
        pdf_bytes = pdf_filler.fill_direct_deposit_form(pdf_data)

        if pdf_bytes and len(pdf_bytes) > 1000:  # Reasonable PDF size
            print(f"\n✅ PDF Generation SUCCESSFUL! Size: {len(pdf_bytes)} bytes")

            # Save for inspection
            output_path = os.path.join(os.path.dirname(__file__), "test_actual_frontend_data.pdf")
            with open(output_path, "wb") as f:
                f.write(pdf_bytes)
            print(f"📄 PDF saved to: {output_path}")
        else:
            print(f"\n❌ PDF Generation FAILED! Size: {len(pdf_bytes) if pdf_bytes else 0} bytes")

    except Exception as e:
        print(f"\n❌ PDF Generation ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_actual_frontend_data_flow()
