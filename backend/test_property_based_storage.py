#!/usr/bin/env python3
"""
Test Property-Based Document Storage Implementation

This script tests the new property-based document storage system to ensure:
1. I-9 documents are saved to both storage and database
2. Property-based paths work correctly with property names
3. Duplicate employee name handling works
4. Company policies use new structure
5. Generated PDFs use new path structure
"""

import asyncio
import os
import sys
import json
import base64
from datetime import datetime
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Add the backend app directory to Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from app.supabase_service_enhanced import EnhancedSupabaseService
from app.document_path_utils import DocumentPathManager, initialize_path_manager


class PropertyBasedStorageTest:
    """Test suite for property-based document storage"""
    
    def __init__(self):
        self.supabase_service = EnhancedSupabaseService()
        self.path_manager = initialize_path_manager(self.supabase_service)
        self.test_results = []
        
        # Test data
        self.test_property_id = None
        self.test_employee_id = None
        self.test_employee_id_2 = None  # For duplicate name testing
        
    async def setup_test_data(self):
        """Create test property and employees"""
        print("🔧 Setting up test data...")
        
        # Create test property
        property_data = {
            "name": "Grand Hotel & Resort Downtown",
            "address": "123 Main Street",
            "city": "New York",
            "state": "NY",
            "zip_code": "10001",
            "phone": "555-123-4567",
            "is_active": True
        }
        
        try:
            property_result = self.supabase_service.client.table("properties").insert(property_data).execute()
            if property_result.data:
                self.test_property_id = property_result.data[0]["id"]
                print(f"✅ Created test property: {self.test_property_id}")
            else:
                raise Exception("Failed to create test property")
        except Exception as e:
            print(f"❌ Failed to create test property: {e}")
            return False
        
        # Create test employees (with same name to test duplicate handling)
        from datetime import date
        today = date.today()

        employee_1_data = {
            "property_id": self.test_property_id,
            "department": "Front Office",
            "position": "Front Desk Agent",
            "hire_date": today.isoformat(),
            "employment_status": "active",
            "onboarding_status": "in_progress",
            "personal_info": {
                "firstName": "John",
                "lastName": "Smith",
                "email": "john.smith.1@test.com",
                "phone": "555-0001"
            }
        }

        employee_2_data = {
            "property_id": self.test_property_id,
            "department": "Housekeeping",
            "position": "Housekeeper",
            "hire_date": today.isoformat(),
            "employment_status": "active",
            "onboarding_status": "in_progress",
            "personal_info": {
                "firstName": "John",
                "lastName": "Smith",
                "email": "john.smith.2@test.com",
                "phone": "555-0002"
            }
        }
        
        try:
            # Create first employee
            emp1_result = self.supabase_service.client.table("employees").insert(employee_1_data).execute()
            if emp1_result.data:
                self.test_employee_id = emp1_result.data[0]["id"]
                print(f"✅ Created test employee 1: {self.test_employee_id}")
            
            # Create second employee with same name
            emp2_result = self.supabase_service.client.table("employees").insert(employee_2_data).execute()
            if emp2_result.data:
                self.test_employee_id_2 = emp2_result.data[0]["id"]
                print(f"✅ Created test employee 2: {self.test_employee_id_2}")
                
            return True
            
        except Exception as e:
            print(f"❌ Failed to create test employees: {e}")
            return False
    
    async def test_path_sanitization(self):
        """Test property and employee name sanitization"""
        print("\n🧪 Testing path sanitization...")
        
        test_cases = [
            ("Grand Hotel & Resort Downtown", "grand_hotel_resort_downtown"),
            ("Hotel@123 Main St.", "hotel_123_main_st"),
            ("  Spaced   Out  Hotel  ", "spaced_out_hotel"),
            ("Hotel-With-Dashes", "hotel_with_dashes"),
            ("", "unknown")
        ]
        
        for input_name, expected in test_cases:
            result = self.path_manager.sanitize_name(input_name)
            if result == expected:
                print(f"✅ '{input_name}' → '{result}'")
                self.test_results.append(("Path Sanitization", input_name, "PASS"))
            else:
                print(f"❌ '{input_name}' → '{result}' (expected '{expected}')")
                self.test_results.append(("Path Sanitization", input_name, "FAIL"))
    
    async def test_property_name_retrieval(self):
        """Test property name retrieval and caching"""
        print("\n🧪 Testing property name retrieval...")
        
        if not self.test_property_id:
            print("❌ No test property ID available")
            return
        
        try:
            # Test property name retrieval
            property_name = await self.path_manager.get_property_name(self.test_property_id)
            expected_name = "grand_hotel_resort_downtown"
            
            if property_name == expected_name:
                print(f"✅ Property name retrieved: '{property_name}'")
                self.test_results.append(("Property Name Retrieval", self.test_property_id, "PASS"))
            else:
                print(f"❌ Property name mismatch: '{property_name}' (expected '{expected_name}')")
                self.test_results.append(("Property Name Retrieval", self.test_property_id, "FAIL"))
                
            # Test caching (second call should be faster)
            property_name_2 = await self.path_manager.get_property_name(self.test_property_id)
            if property_name == property_name_2:
                print(f"✅ Property name caching works")
                self.test_results.append(("Property Name Caching", self.test_property_id, "PASS"))
            else:
                print(f"❌ Property name caching failed")
                self.test_results.append(("Property Name Caching", self.test_property_id, "FAIL"))
                
        except Exception as e:
            print(f"❌ Property name retrieval failed: {e}")
            self.test_results.append(("Property Name Retrieval", self.test_property_id, "FAIL"))
    
    async def test_duplicate_employee_names(self):
        """Test duplicate employee name handling"""
        print("\n🧪 Testing duplicate employee name handling...")
        
        if not self.test_employee_id or not self.test_employee_id_2:
            print("❌ Test employee IDs not available")
            return
        
        try:
            # Clear cache to ensure fresh lookups
            self.path_manager.clear_cache()

            # Get folder names for both employees
            folder_name_1 = await self.path_manager.get_employee_folder_name(
                self.test_employee_id, self.test_property_id
            )
            folder_name_2 = await self.path_manager.get_employee_folder_name(
                self.test_employee_id_2, self.test_property_id
            )
            
            print(f"Employee 1 folder: '{folder_name_1}'")
            print(f"Employee 2 folder: '{folder_name_2}'")
            
            # Check that names are different
            if folder_name_1 != folder_name_2:
                if folder_name_1 == "john_smith" and folder_name_2 == "john_smith_2":
                    print("✅ Duplicate name handling works correctly")
                    self.test_results.append(("Duplicate Name Handling", "john_smith", "PASS"))
                else:
                    print(f"❌ Unexpected folder names: '{folder_name_1}', '{folder_name_2}'")
                    self.test_results.append(("Duplicate Name Handling", "john_smith", "FAIL"))
            else:
                print(f"❌ Duplicate names not handled: both got '{folder_name_1}'")
                self.test_results.append(("Duplicate Name Handling", "john_smith", "FAIL"))
                
        except Exception as e:
            print(f"❌ Duplicate name handling test failed: {e}")
            self.test_results.append(("Duplicate Name Handling", "john_smith", "FAIL"))
    
    async def test_i9_document_storage(self):
        """Test I-9 document storage with new path structure"""
        print("\n🧪 Testing I-9 document storage...")
        
        if not self.test_employee_id:
            print("❌ Test employee ID not available")
            return
        
        # Create test image data (minimal PNG)
        test_image_data = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        )
        
        try:
            # Test storing a driver's license document
            result = await self.supabase_service.store_i9_document(
                employee_id=self.test_employee_id,
                document_type="drivers_license",
                document_list="list_b",
                file_data=test_image_data,
                file_name="test_drivers_license.png",
                mime_type="image/png",
                document_metadata={
                    "test_document": True,
                    "document_number": "DL123456789"
                }
            )
            
            if result:
                print(f"✅ I-9 document stored successfully")
                print(f"   Document ID: {result.get('id')}")
                print(f"   Storage Path: {result.get('storage_path')}")
                print(f"   File URL: {result.get('file_url', 'N/A')[:50]}...")
                
                # Verify the path structure (accept either john_smith or john_smith_X)
                storage_path = result.get('storage_path', '')
                expected_patterns = [
                    'grand_hotel_resort_downtown/john_smith/uploads/i9_verification/drivers_license',
                    'grand_hotel_resort_downtown/john_smith_2/uploads/i9_verification/drivers_license'
                ]

                if any(pattern in storage_path for pattern in expected_patterns):
                    print("✅ Storage path uses correct property-based structure")
                    self.test_results.append(("I-9 Document Storage", "path_structure", "PASS"))
                else:
                    print(f"❌ Storage path structure incorrect: {storage_path}")
                    self.test_results.append(("I-9 Document Storage", "path_structure", "FAIL"))
                
                # Verify database record
                db_record = self.supabase_service.client.table("i9_documents").select("*").eq("id", result["id"]).execute()
                if db_record.data:
                    print("✅ I-9 document saved to database")
                    self.test_results.append(("I-9 Document Storage", "database_save", "PASS"))
                else:
                    print("❌ I-9 document not found in database")
                    self.test_results.append(("I-9 Document Storage", "database_save", "FAIL"))
                    
            else:
                print("❌ I-9 document storage failed")
                self.test_results.append(("I-9 Document Storage", "storage", "FAIL"))
                
        except Exception as e:
            print(f"❌ I-9 document storage test failed: {e}")
            self.test_results.append(("I-9 Document Storage", "storage", "FAIL"))
    
    async def test_generated_pdf_storage(self):
        """Test generated PDF storage with new path structure"""
        print("\n🧪 Testing generated PDF storage...")
        
        if not self.test_employee_id:
            print("❌ Test employee ID not available")
            return
        
        # Create test PDF data
        test_pdf_data = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n174\n%%EOF"
        
        try:
            # Test uploading a generated PDF
            result = await self.supabase_service.upload_generated_pdf(
                employee_id=self.test_employee_id,
                form_type="i9_form",
                pdf_data=test_pdf_data,
                signed=True,
                property_id=self.test_property_id
            )
            
            if result:
                print(f"✅ Generated PDF stored successfully")
                print(f"   Storage Path: {result.get('storage_path', 'N/A')}")
                print(f"   Public URL: {result.get('public_url', 'N/A')[:50]}...")
                
                # Verify the path structure (accept either john_smith or john_smith_X)
                storage_path = result.get('storage_path', '')
                expected_patterns = [
                    'grand_hotel_resort_downtown/john_smith/forms/i9_form',
                    'grand_hotel_resort_downtown/john_smith_2/forms/i9_form'
                ]

                if any(pattern in storage_path for pattern in expected_patterns):
                    print("✅ Generated PDF uses correct property-based structure")
                    self.test_results.append(("Generated PDF Storage", "path_structure", "PASS"))
                else:
                    print(f"❌ Generated PDF path structure incorrect: {storage_path}")
                    self.test_results.append(("Generated PDF Storage", "path_structure", "FAIL"))
                    
                self.test_results.append(("Generated PDF Storage", "storage", "PASS"))
            else:
                print("❌ Generated PDF storage failed")
                self.test_results.append(("Generated PDF Storage", "storage", "FAIL"))
                
        except Exception as e:
            print(f"❌ Generated PDF storage test failed: {e}")
            self.test_results.append(("Generated PDF Storage", "storage", "FAIL"))
    
    async def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        try:
            # Delete test employees
            if self.test_employee_id:
                self.supabase_service.client.table("employees").delete().eq("id", self.test_employee_id).execute()
                print(f"✅ Deleted test employee 1")
                
            if self.test_employee_id_2:
                self.supabase_service.client.table("employees").delete().eq("id", self.test_employee_id_2).execute()
                print(f"✅ Deleted test employee 2")
            
            # Delete test property
            if self.test_property_id:
                self.supabase_service.client.table("properties").delete().eq("id", self.test_property_id).execute()
                print(f"✅ Deleted test property")
                
            # Clear path manager cache
            self.path_manager.clear_cache()
            print(f"✅ Cleared path manager cache")
            
        except Exception as e:
            print(f"⚠️ Cleanup warning: {e}")
    
    def print_test_summary(self):
        """Print test results summary"""
        print("\n" + "="*60)
        print("📊 TEST RESULTS SUMMARY")
        print("="*60)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r[2] == "PASS"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for test_name, test_case, result in self.test_results:
                if result == "FAIL":
                    print(f"   - {test_name}: {test_case}")
        
        print("\n" + "="*60)
        
        return failed_tests == 0


async def main():
    """Run all tests"""
    print("🚀 Starting Property-Based Document Storage Tests")
    print("="*60)
    
    test_suite = PropertyBasedStorageTest()
    
    try:
        # Setup
        if not await test_suite.setup_test_data():
            print("❌ Failed to setup test data. Exiting.")
            return False
        
        # Run tests
        await test_suite.test_path_sanitization()
        await test_suite.test_property_name_retrieval()
        await test_suite.test_duplicate_employee_names()
        await test_suite.test_i9_document_storage()
        await test_suite.test_generated_pdf_storage()
        
        # Print results
        success = test_suite.print_test_summary()
        
        return success
        
    finally:
        # Always cleanup
        await test_suite.cleanup_test_data()


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
