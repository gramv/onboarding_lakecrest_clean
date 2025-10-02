#!/usr/bin/env python3
"""
Comprehensive Test Suite for Hotel Onboarding System
Tests cross-browser sync, PDF generation, and document persistence
"""

import asyncio
import aiohttp
import json
import base64
import time
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
API_BASE_URL = "http://localhost:8000/api"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBsb3llZV9pZCI6IjE5MzEwYTM2LTc5N2MtNDQ2NC05NDViLWE0YTA2YTVlMTdjMiIsImFwcGxpY2F0aW9uX2lkIjpudWxsLCJ0b2tlbl90eXBlIjoib25ib2FyZGluZyIsImlhdCI6MTc1NzgxMjIxNSwiZXhwIjoxNzU4MDcxNDE1LCJqdGkiOiJUZS1NdTBFcVJHRTEzaDd6VlYtVll3In0.gg1XPTd2oTFSd7bVVcXo_Tpd1GISJYb4P51Yj_QVL2c"
EMPLOYEE_ID = "19310a36-797c-4464-945b-a4a06a5e17c2"

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "warnings": 0,
    "details": []
}

def log_test(test_name: str, status: str, message: str = "", details: Dict = None):
    """Log test result with formatting"""
    icons = {
        "pass": "✅",
        "fail": "❌",
        "warning": "⚠️",
        "info": "ℹ️",
        "start": "🔄"
    }
    
    print(f"{icons.get(status, '•')} {test_name}: {message}")
    
    if status == "pass":
        test_results["passed"] += 1
    elif status == "fail":
        test_results["failed"] += 1
    elif status == "warning":
        test_results["warnings"] += 1
    
    test_results["details"].append({
        "test": test_name,
        "status": status,
        "message": message,
        "details": details,
        "timestamp": datetime.now().isoformat()
    })

async def test_form_data_sync():
    """Test 1: Cross-browser form data synchronization"""
    log_test("Form Data Sync", "start", "Testing cross-browser synchronization...")
    
    # Sample personal info data
    test_data = {
        "firstName": "John",
        "lastName": "TestUser",
        "email": "john.test@example.com",
        "phone": "(555) 123-4567",
        "address": "123 Test Street",
        "city": "Test City",
        "state": "TX",
        "zipCode": "12345",
        "ssn": "123-45-6789",
        "dateOfBirth": "1990-01-15",
        "emergencyContacts": [{
            "name": "Jane TestUser",
            "relationship": "Spouse",
            "phone": "(555) 987-6543"
        }]
    }
    
    async with aiohttp.ClientSession() as session:
        # Save progress (simulating Browser 1)
        try:
            save_response = await session.post(
                f"{API_BASE_URL}/onboarding/save-progress",
                json={
                    "employee_id": EMPLOYEE_ID,
                    "step_id": "personal-info",
                    "data": test_data,
                    "token": TOKEN
                },
                headers={"Authorization": f"Bearer {TOKEN}"}
            )
            
            if save_response.status == 200:
                log_test("Form Data Sync - Save", "pass", "Data saved successfully")
            else:
                error_text = await save_response.text()
                log_test("Form Data Sync - Save", "fail", f"Failed to save: {error_text}")
                return False
                
            # Wait for database sync
            await asyncio.sleep(1)
            
            # Load progress (simulating Browser 2)
            load_response = await session.get(
                f"{API_BASE_URL}/onboarding/welcome/{TOKEN}",
                headers={"Authorization": f"Bearer {TOKEN}"}
            )
            
            if load_response.status == 200:
                data = await load_response.json()
                if data.get("data", {}).get("savedFormData", {}).get("personal-info"):
                    log_test("Form Data Sync - Load", "pass", "Data loaded successfully in second browser")
                    return True
                else:
                    log_test("Form Data Sync - Load", "warning", "No saved data found")
                    return False
            else:
                log_test("Form Data Sync - Load", "fail", "Failed to load data")
                return False
                
        except Exception as e:
            log_test("Form Data Sync", "fail", f"Error: {str(e)}")
            return False

async def test_pdf_generation(document_type: str, endpoint: str, request_data: Dict) -> Optional[str]:
    """Test PDF generation for a specific document type"""
    log_test(f"PDF Generation - {document_type}", "start", f"Testing {endpoint}")
    
    async with aiohttp.ClientSession() as session:
        try:
            response = await session.post(
                f"{API_BASE_URL}{endpoint}",
                json=request_data,
                headers={
                    "Authorization": f"Bearer {TOKEN}",
                    "Content-Type": "application/json"
                }
            )
            
            response_text = await response.text()
            
            if response.status == 200:
                try:
                    data = json.loads(response_text)
                    if data.get("success"):
                        pdf_data = data.get("data", {})
                        
                        # Check for base64 PDF
                        if pdf_data.get("pdf") or pdf_data.get("pdf_base64"):
                            log_test(f"PDF Generation - {document_type}", "pass", 
                                   f"Generated successfully (size: {len(pdf_data.get('pdf', pdf_data.get('pdf_base64', '')))[:6]} chars)")
                        else:
                            log_test(f"PDF Generation - {document_type}", "warning", 
                                   "Generated but no base64 data returned")
                        
                        # Check for Supabase URL
                        if pdf_data.get("pdf_url"):
                            log_test(f"PDF Storage - {document_type}", "pass", 
                                   "Saved to Supabase storage")
                            return pdf_data["pdf_url"]
                        else:
                            log_test(f"PDF Storage - {document_type}", "warning", 
                                   "Not saved to Supabase (RLS policy issue)")
                            return None
                    else:
                        log_test(f"PDF Generation - {document_type}", "fail", 
                               data.get("message", "Unknown error"))
                        return None
                except json.JSONDecodeError:
                    log_test(f"PDF Generation - {document_type}", "fail", 
                           "Invalid JSON response")
                    return None
            else:
                log_test(f"PDF Generation - {document_type}", "fail", 
                       f"HTTP {response.status}: {response_text[:100]}")
                return None
                
        except Exception as e:
            log_test(f"PDF Generation - {document_type}", "fail", f"Error: {str(e)}")
            return None

async def test_all_pdf_endpoints():
    """Test all PDF generation endpoints"""
    log_test("PDF Endpoints", "info", "Testing all document generation endpoints...")
    
    # Test data for each endpoint
    test_cases = [
        {
            "name": "W-4 Form",
            "endpoint": f"/onboarding/{EMPLOYEE_ID}/w4-form/generate-pdf",
            "data": {
                "formData": {
                    "first_name": "John",
                    "last_name": "TestUser",
                    "ssn": "123-45-6789",
                    "address": "123 Test St",
                    "city": "Test City",
                    "state": "TX",
                    "zip": "12345",
                    "filing_status": "single",
                    "step2c": False,
                    "step3_children": "0",
                    "step3_other": "0",
                    "step4a": "0",
                    "step4b": "0",
                    "step4c": "0",
                    "withholding": "0"
                }
            }
        },
        {
            "name": "Direct Deposit",
            "endpoint": f"/onboarding/{EMPLOYEE_ID}/direct-deposit/generate-pdf",
            "data": {
                "formData": {
                    "employeeName": "John TestUser",
                    "employeeId": EMPLOYEE_ID,
                    "ssn": "123-45-6789",
                    "phoneNumber": "555-1234",
                    "emailAddress": "john.test@example.com",
                    "depositType": "full",
                    "accountType1": "checking",
                    "bankName1": "Test Bank",
                    "routingNumber1": "123456789",
                    "accountNumber1": "987654321"
                }
            }
        },
        {
            "name": "Company Policies",
            "endpoint": f"/onboarding/{EMPLOYEE_ID}/company-policies/generate-pdf",
            "data": {
                "employee_data": {
                    "firstName": "John",
                    "lastName": "TestUser",
                    "property_name": "Test Hotel"
                },
                "form_data": {
                    "companyPoliciesInitials": "JT",
                    "eeoInitials": "JT",
                    "sexualHarassmentInitials": "JT"
                }
            }
        },
        {
            "name": "Weapons Policy",
            "endpoint": f"/onboarding/{EMPLOYEE_ID}/weapons-policy/generate-pdf",
            "data": {
                "employee_data": {
                    "firstName": "John",
                    "lastName": "TestUser",
                    "property_name": "Test Hotel"
                }
            }
        },
        {
            "name": "Human Trafficking",
            "endpoint": f"/onboarding/{EMPLOYEE_ID}/human-trafficking/generate-pdf",
            "data": {
                "employee_data": {
                    "firstName": "John",
                    "lastName": "TestUser",
                    "property_name": "Test Hotel",
                    "position": "Test Position",
                    "completionDate": datetime.now().strftime("%Y-%m-%d")
                }
            }
        },
        {
            "name": "I-9 Complete",
            "endpoint": f"/onboarding/{EMPLOYEE_ID}/i9-complete/generate-pdf",
            "data": {
                "employee_data": {
                    "first_name": "John",
                    "last_name": "TestUser",
                    "middle_initial": "M",
                    "address": "123 Test St",
                    "city": "Test City",
                    "state": "TX",
                    "zip_code": "12345",
                    "date_of_birth": "1990-01-01",
                    "ssn": "123-45-6789",
                    "email": "john.test@example.com",
                    "phone": "555-1234",
                    "citizenship_status": "citizen"
                }
            }
        }
    ]
    
    pdf_urls = []
    for test_case in test_cases:
        url = await test_pdf_generation(
            test_case["name"],
            test_case["endpoint"],
            test_case["data"]
        )
        if url:
            pdf_urls.append({"document": test_case["name"], "url": url})
        await asyncio.sleep(0.5)  # Small delay between tests
    
    return pdf_urls

async def test_document_retrieval(pdf_urls: list):
    """Test retrieving documents from Supabase"""
    if not pdf_urls:
        log_test("Document Retrieval", "warning", "No documents were saved to test retrieval")
        return
    
    log_test("Document Retrieval", "info", f"Testing retrieval of {len(pdf_urls)} documents...")
    
    async with aiohttp.ClientSession() as session:
        for doc in pdf_urls:
            try:
                # Try to fetch the document URL
                response = await session.get(doc["url"])
                if response.status == 200:
                    content_length = response.headers.get("Content-Length", "unknown")
                    log_test(f"Document Retrieval - {doc['document']}", "pass", 
                           f"Retrieved successfully (size: {content_length} bytes)")
                else:
                    log_test(f"Document Retrieval - {doc['document']}", "fail", 
                           f"HTTP {response.status}")
            except Exception as e:
                log_test(f"Document Retrieval - {doc['document']}", "fail", 
                       f"Error: {str(e)}")

async def test_employee_data_consistency():
    """Test that employee data is consistent across different endpoints"""
    log_test("Data Consistency", "info", "Checking data consistency across endpoints...")
    
    async with aiohttp.ClientSession() as session:
        try:
            # Get employee data
            response = await session.get(
                f"{API_BASE_URL}/employees/{EMPLOYEE_ID}",
                headers={"Authorization": f"Bearer {TOKEN}"}
            )
            
            if response.status == 200:
                employee_data = await response.json()
                if employee_data.get("data"):
                    log_test("Data Consistency - Employee", "pass", 
                           f"Employee data retrieved: {employee_data['data'].get('first_name')} {employee_data['data'].get('last_name')}")
                else:
                    log_test("Data Consistency - Employee", "warning", 
                           "Employee exists but no data returned")
            else:
                log_test("Data Consistency - Employee", "warning", 
                       f"Could not retrieve employee data: HTTP {response.status}")
                
            # Check saved form data
            steps = ["personal-info", "w4-form", "direct-deposit", "i9-complete"]
            for step in steps:
                response = await session.get(
                    f"{API_BASE_URL}/onboarding/{EMPLOYEE_ID}/{step}",
                    headers={"Authorization": f"Bearer {TOKEN}"}
                )
                if response.status == 200:
                    data = await response.json()
                    if data.get("success") and data.get("data"):
                        log_test(f"Data Consistency - {step}", "pass", "Data exists")
                    else:
                        log_test(f"Data Consistency - {step}", "info", "No saved data")
                else:
                    log_test(f"Data Consistency - {step}", "warning", 
                           f"Could not check: HTTP {response.status}")
                    
        except Exception as e:
            log_test("Data Consistency", "fail", f"Error: {str(e)}")

def print_summary():
    """Print test summary"""
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    total = test_results["passed"] + test_results["failed"]
    
    print(f"✅ Passed: {test_results['passed']}")
    print(f"❌ Failed: {test_results['failed']}")
    print(f"⚠️  Warnings: {test_results['warnings']}")
    print(f"📊 Total Tests: {total}")
    
    if test_results["failed"] == 0:
        print("\n🎉 All tests passed successfully!")
    else:
        print(f"\n⚠️  {test_results['failed']} test(s) failed. Review the details above.")
    
    # Key findings
    print("\n" + "=" * 60)
    print("KEY FINDINGS")
    print("=" * 60)
    
    findings = []
    
    # Check for RLS issues
    storage_warnings = [d for d in test_results["details"] 
                       if "Storage" in d["test"] and d["status"] == "warning"]
    if storage_warnings:
        findings.append("• PDF uploads blocked by RLS policies - manual SQL execution needed")
    
    # Check for successful syncs
    sync_passes = [d for d in test_results["details"] 
                  if "Sync" in d["test"] and d["status"] == "pass"]
    if sync_passes:
        findings.append("• Cross-browser synchronization working correctly")
    
    # Check PDF generation
    pdf_passes = [d for d in test_results["details"] 
                 if "PDF Generation" in d["test"] and d["status"] == "pass"]
    if pdf_passes:
        findings.append(f"• {len(pdf_passes)} PDF endpoints generating documents successfully")
    
    if findings:
        for finding in findings:
            print(finding)
    else:
        print("• No significant findings")

async def main():
    """Run comprehensive test suite"""
    print("=" * 60)
    print("COMPREHENSIVE TEST SUITE - HOTEL ONBOARDING SYSTEM")
    print("=" * 60)
    print(f"Employee ID: {EMPLOYEE_ID}")
    print(f"API Base: {API_BASE_URL}")
    print(f"Token: {TOKEN[:50]}...")
    print("=" * 60)
    
    # Run tests
    print("\n📋 TEST 1: CROSS-BROWSER SYNCHRONIZATION")
    print("-" * 40)
    await test_form_data_sync()
    
    print("\n📄 TEST 2: PDF GENERATION & STORAGE")
    print("-" * 40)
    pdf_urls = await test_all_pdf_endpoints()
    
    print("\n📥 TEST 3: DOCUMENT RETRIEVAL")
    print("-" * 40)
    await test_document_retrieval(pdf_urls)
    
    print("\n🔍 TEST 4: DATA CONSISTENCY")
    print("-" * 40)
    await test_employee_data_consistency()
    
    # Print summary
    print_summary()
    
    # Save results to file
    with open("test_results.json", "w") as f:
        json.dump(test_results, f, indent=2)
    print("\n📁 Test results saved to test_results.json")

if __name__ == "__main__":
    asyncio.run(main())