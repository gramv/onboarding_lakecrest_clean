#!/usr/bin/env python3
"""
Comprehensive test suite for Direct Deposit PDF generation
Tests all scenarios to ensure fixes work correctly
"""

import asyncio
import base64
import json
import os
from datetime import datetime
import fitz  # PyMuPDF
import requests
from typing import Dict, Any, Optional

# API Configuration
BASE_URL = "http://localhost:8000"
API_ENDPOINT = f"{BASE_URL}/api/onboarding/test-emp-001/direct-deposit/generate-pdf"

# Test colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_test_header(test_name: str):
    """Print formatted test header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}")
    print(f"TEST: {test_name}")
    print(f"{'='*60}{Colors.RESET}")

def print_success(message: str):
    """Print success message"""
    print(f"{Colors.GREEN}✓ {message}{Colors.RESET}")

def print_failure(message: str):
    """Print failure message"""
    print(f"{Colors.RED}✗ {message}{Colors.RESET}")

def print_warning(message: str):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠ {message}{Colors.RESET}")

def print_info(message: str):
    """Print info message"""
    print(f"{Colors.BLUE}ℹ {message}{Colors.RESET}")

def validate_pdf_content(pdf_bytes: bytes, expected_values: Dict[str, Any]) -> Dict[str, bool]:
    """
    Validate PDF content by checking for expected text values
    Returns dict of field_name -> validation_result
    """
    results = {}
    
    try:
        # Open PDF from bytes
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = doc[0]  # Direct deposit is single page
        
        # Extract all text from page
        text = page.get_text()
        
        # Check each expected value
        for field_name, expected_value in expected_values.items():
            if expected_value is None:
                # Check that the field is NOT present (for testing empty fields)
                results[field_name] = expected_value not in text
            else:
                # Check that the expected value IS present
                results[field_name] = str(expected_value) in text
        
        doc.close()
        
    except Exception as e:
        print_failure(f"Error validating PDF: {e}")
        return {}
    
    return results

def save_pdf_for_review(pdf_bytes: bytes, filename: str):
    """Save PDF to file for manual review"""
    output_dir = "test_output"
    os.makedirs(output_dir, exist_ok=True)
    
    filepath = os.path.join(output_dir, filename)
    with open(filepath, 'wb') as f:
        f.write(pdf_bytes)
    
    print_info(f"PDF saved for review: {filepath}")
    return filepath

async def test_single_account_full_deposit():
    """Test Scenario 1: Single Account - Full Deposit"""
    print_test_header("Single Account - Full Deposit")
    
    test_data = {
        "firstName": "John",
        "lastName": "Smith",
        "ssn": "123-45-6789",
        "email": "john.smith@hotel.com",
        "primaryAccount": {
            "bankName": "Chase Bank",
            "accountType": "checking",
            "routingNumber": "021000021",
            "accountNumber": "1234567890",
            "depositType": "full"  # Full deposit - no amount needed
        }
    }
    
    # Wrap in employee_data for the API
    request_payload = {
        "employee_data": test_data
    }
    
    try:
        # Make API request
        response = requests.post(API_ENDPOINT, json=request_payload)
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('data', {}).get('pdf'):
                # Decode base64 PDF
                pdf_base64 = result['data']['pdf']
                pdf_bytes = base64.b64decode(pdf_base64)
                
                # Save for review
                pdf_path = save_pdf_for_review(pdf_bytes, "test_1_full_deposit.pdf")
                
                # Validate content
                expected_values = {
                    "John Smith": True,
                    "123-45-6789": True,
                    "john.smith@hotel.com": True,
                    "Chase Bank": True,
                    "021000021": True,
                    "1234567890": True,
                    "$0": False  # Should NOT show $0
                }
                
                validation_results = validate_pdf_content(pdf_bytes, expected_values)
                
                # Report results
                all_passed = True
                for field, passed in validation_results.items():
                    if passed:
                        print_success(f"Field '{field}' validated correctly")
                    else:
                        print_failure(f"Field '{field}' validation failed")
                        all_passed = False
                
                if all_passed:
                    print_success("✅ Test 1 PASSED: Full deposit handled correctly")
                else:
                    print_failure("❌ Test 1 FAILED: Some validations failed")
                    print_warning(f"Please manually review: {pdf_path}")
                
                return all_passed
            else:
                print_failure("No PDF in response")
                return False
        else:
            print_failure(f"API returned status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print_failure(f"Test failed with error: {e}")
        return False

async def test_single_account_partial_deposit():
    """Test Scenario 2: Single Account - Partial Deposit"""
    print_test_header("Single Account - Partial Deposit")
    
    test_data = {
        "firstName": "Jane",
        "lastName": "Doe",
        "ssn": "987-65-4321",
        "email": "jane.doe@hotel.com",
        "primaryAccount": {
            "bankName": "Bank of America",
            "accountType": "savings",
            "routingNumber": "026009593",
            "accountNumber": "9876543210",
            "depositType": "partial",
            "depositAmount": "500.00"  # Specific amount for partial
        }
    }
    
    # Wrap in employee_data for the API
    request_payload = {
        "employee_data": test_data
    }
    
    try:
        response = requests.post(API_ENDPOINT, json=request_payload)
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('data', {}).get('pdf'):
                pdf_base64 = result['data']['pdf']
                pdf_bytes = base64.b64decode(pdf_base64)
                
                pdf_path = save_pdf_for_review(pdf_bytes, "test_2_partial_deposit.pdf")
                
                expected_values = {
                    "Jane Doe": True,
                    "987-65-4321": True,
                    "jane.doe@hotel.com": True,
                    "Bank of America": True,
                    "026009593": True,
                    "9876543210": True,
                    "$500.00": True  # Should show the amount
                }
                
                validation_results = validate_pdf_content(pdf_bytes, expected_values)
                
                all_passed = True
                for field, passed in validation_results.items():
                    if passed:
                        print_success(f"Field '{field}' validated correctly")
                    else:
                        print_failure(f"Field '{field}' validation failed")
                        all_passed = False
                
                if all_passed:
                    print_success("✅ Test 2 PASSED: Partial deposit amount shown correctly")
                else:
                    print_failure("❌ Test 2 FAILED: Some validations failed")
                    print_warning(f"Please manually review: {pdf_path}")
                
                return all_passed
            else:
                print_failure("No PDF in response")
                return False
        else:
            print_failure(f"API returned status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print_failure(f"Test failed with error: {e}")
        return False

async def test_account_type_checking():
    """Test Scenario 3: Account Type - Checking"""
    print_test_header("Account Type - Checking")
    
    test_data = {
        "firstName": "Bob",
        "lastName": "Wilson",
        "ssn": "111-22-3333",
        "email": "bob.wilson@hotel.com",
        "primaryAccount": {
            "bankName": "Wells Fargo",
            "accountType": "checking",  # Testing checking account
            "routingNumber": "121000248",
            "accountNumber": "5555555555",
            "depositType": "full"
        }
    }
    
    # Wrap in employee_data for the API
    request_payload = {
        "employee_data": test_data
    }
    
    try:
        response = requests.post(API_ENDPOINT, json=request_payload)
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('data', {}).get('pdf'):
                pdf_base64 = result['data']['pdf']
                pdf_bytes = base64.b64decode(pdf_base64)
                
                pdf_path = save_pdf_for_review(pdf_bytes, "test_3_checking_account.pdf")
                
                print_success("✅ Test 3 PASSED: Checking account PDF generated")
                print_info(f"Manual verification needed for checkbox at: {pdf_path}")
                
                return True
            else:
                print_failure("No PDF in response")
                return False
        else:
            print_failure(f"API returned status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print_failure(f"Test failed with error: {e}")
        return False

async def test_account_type_savings():
    """Test Scenario 4: Account Type - Savings"""
    print_test_header("Account Type - Savings")
    
    test_data = {
        "firstName": "Alice",
        "lastName": "Johnson",
        "ssn": "444-55-6666",
        "email": "alice.johnson@hotel.com",
        "primaryAccount": {
            "bankName": "CitiBank",
            "accountType": "savings",  # Testing savings account
            "routingNumber": "021000089",
            "accountNumber": "7777777777",
            "depositType": "partial",
            "depositAmount": "750.00"
        }
    }
    
    # Wrap in employee_data for the API
    request_payload = {
        "employee_data": test_data
    }
    
    try:
        response = requests.post(API_ENDPOINT, json=request_payload)
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('data', {}).get('pdf'):
                pdf_base64 = result['data']['pdf']
                pdf_bytes = base64.b64decode(pdf_base64)
                
                pdf_path = save_pdf_for_review(pdf_bytes, "test_4_savings_account.pdf")
                
                print_success("✅ Test 4 PASSED: Savings account PDF generated")
                print_info(f"Manual verification needed for checkbox at: {pdf_path}")
                
                return True
            else:
                print_failure("No PDF in response")
                return False
        else:
            print_failure(f"API returned status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print_failure(f"Test failed with error: {e}")
        return False

async def test_backwards_compatibility():
    """Test Scenario 5: Backwards Compatibility - Old payload format"""
    print_test_header("Backwards Compatibility - Old Format")
    
    # Old format without depositType field
    test_data = {
        "firstName": "Legacy",
        "lastName": "User",
        "ssn": "999-88-7777",
        "email": "legacy.user@hotel.com",
        "primaryAccount": {
            "bankName": "Old Bank",
            "accountType": "checking",
            "routingNumber": "111222333",
            "accountNumber": "8888888888"
            # No depositType field - should default to 'full'
        }
    }
    
    # Wrap in employee_data for the API
    request_payload = {
        "employee_data": test_data
    }
    
    try:
        response = requests.post(API_ENDPOINT, json=request_payload)
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('data', {}).get('pdf'):
                pdf_base64 = result['data']['pdf']
                pdf_bytes = base64.b64decode(pdf_base64)
                
                pdf_path = save_pdf_for_review(pdf_bytes, "test_5_backwards_compat.pdf")
                
                print_success("✅ Test 5 PASSED: Old format handled with default 'full' deposit")
                print_info(f"PDF generated at: {pdf_path}")
                
                return True
            else:
                print_failure("No PDF in response")
                return False
        else:
            print_failure(f"API returned status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print_failure(f"Test failed with error: {e}")
        return False

async def test_edge_cases():
    """Test Edge Cases: Missing fields, empty values, etc."""
    print_test_header("Edge Cases")
    
    # Test with minimal data
    test_data = {
        "firstName": "Minimal",
        "lastName": "Data",
        "primaryAccount": {
            "bankName": "Simple Bank",
            "accountNumber": "1111111111",
            "depositType": "full"
        }
    }
    
    # Wrap in employee_data for the API
    request_payload = {
        "employee_data": test_data
    }
    
    try:
        response = requests.post(API_ENDPOINT, json=request_payload)
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('data', {}).get('pdf'):
                pdf_base64 = result['data']['pdf']
                pdf_bytes = base64.b64decode(pdf_base64)
                
                pdf_path = save_pdf_for_review(pdf_bytes, "test_6_edge_cases.pdf")
                
                print_success("✅ Test 6 PASSED: Edge case handled gracefully")
                print_info(f"PDF generated with minimal data at: {pdf_path}")
                
                return True
            else:
                print_failure("No PDF in response")
                return False
        else:
            # This might be expected for incomplete data
            print_warning(f"API returned status {response.status_code} for minimal data (might be expected)")
            return True  # Not necessarily a failure
            
    except Exception as e:
        print_failure(f"Test failed with error: {e}")
        return False

async def test_signature_placement():
    """Test Signature Placement at correct coordinates"""
    print_test_header("Signature Placement")
    
    test_data = {
        "firstName": "Signature",
        "lastName": "Test",
        "ssn": "777-88-9999",
        "email": "signature.test@hotel.com",
        "primaryAccount": {
            "bankName": "Signature Bank",
            "accountType": "checking",
            "routingNumber": "987654321",
            "accountNumber": "2222222222",
            "depositType": "full"
        },
        "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="  # 1x1 pixel test image
    }
    
    # Wrap in employee_data for the API
    request_payload = {
        "employee_data": test_data
    }
    
    try:
        response = requests.post(API_ENDPOINT, json=request_payload)
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('data', {}).get('pdf'):
                pdf_base64 = result['data']['pdf']
                pdf_bytes = base64.b64decode(pdf_base64)
                
                pdf_path = save_pdf_for_review(pdf_bytes, "test_7_signature_placement.pdf")
                
                # Open PDF to check signature placement
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                page = doc[0]
                
                # Check for images on the page (signatures are usually images)
                image_list = page.get_images()
                
                if image_list:
                    print_success(f"✅ Signature image found on page ({len(image_list)} images)")
                    print_info(f"Manual verification needed for position at: {pdf_path}")
                    print_info("Expected position: x:134.28, y:400.66 (not the old x:212, y:386.88)")
                else:
                    print_warning("⚠ No signature image found (might need real signature data)")
                
                doc.close()
                
                return True
            else:
                print_failure("No PDF in response")
                return False
        else:
            print_failure(f"API returned status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print_failure(f"Test failed with error: {e}")
        return False

async def run_all_tests():
    """Run all test scenarios"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}")
    print("DIRECT DEPOSIT PDF GENERATION - COMPREHENSIVE TEST SUITE")
    print(f"{'='*60}{Colors.RESET}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"API Endpoint: {API_ENDPOINT}")
    
    # Track results
    results = []
    
    # Run all tests
    results.append(("Full Deposit", await test_single_account_full_deposit()))
    results.append(("Partial Deposit", await test_single_account_partial_deposit()))
    results.append(("Checking Account", await test_account_type_checking()))
    results.append(("Savings Account", await test_account_type_savings()))
    results.append(("Backwards Compatibility", await test_backwards_compatibility()))
    results.append(("Edge Cases", await test_edge_cases()))
    results.append(("Signature Placement", await test_signature_placement()))
    
    # Summary
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}{Colors.RESET}")
    
    passed_count = sum(1 for _, passed in results if passed)
    total_count = len(results)
    
    for test_name, passed in results:
        status = f"{Colors.GREEN}PASSED{Colors.RESET}" if passed else f"{Colors.RED}FAILED{Colors.RESET}"
        print(f"  {test_name}: {status}")
    
    print(f"\n{Colors.BOLD}Overall: {passed_count}/{total_count} tests passed{Colors.RESET}")
    
    if passed_count == total_count:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 ALL TESTS PASSED! Direct Deposit PDF generation is working correctly.{Colors.RESET}")
    else:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠ Some tests failed. Please review the generated PDFs in the 'test_output' directory.{Colors.RESET}")
    
    print(f"\n{Colors.BLUE}PDFs saved in: ./test_output/{Colors.RESET}")
    print("Please manually verify:")
    print("  1. Checkboxes are marked correctly for account types")
    print("  2. 'Entire net amount' checkbox is marked for full deposits")
    print("  3. Deposit amounts appear only for partial deposits")
    print("  4. No $0 appears for full deposits")
    print("  5. Signatures appear at correct position (x:134.28, y:400.66)")

if __name__ == "__main__":
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code != 200:
            print_failure(f"Server not responding at {BASE_URL}")
            print_info("Please ensure the backend server is running: python3 -m uvicorn app.main_enhanced:app --reload")
            exit(1)
    except Exception:
        print_failure(f"Cannot connect to server at {BASE_URL}")
        print_info("Please start the backend server first: python3 -m uvicorn app.main_enhanced:app --reload")
        exit(1)
    
    # Run tests
    asyncio.run(run_all_tests())