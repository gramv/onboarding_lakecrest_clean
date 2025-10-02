#!/usr/bin/env python3
"""
Test script for session persistence and Save and Continue Later functionality
"""

import asyncio
import aiohttp
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

async def test_session_persistence():
    """Test the session persistence endpoints"""
    
    async with aiohttp.ClientSession() as session:
        print("\n" + "="*60)
        print("Testing Session Persistence and Save/Continue Later")
        print("="*60)
        
        # Test data
        test_session_id = "test_session_123"
        test_employee_id = "temp_test_001"
        test_step_id = "personal_info"
        
        # Sample form data (partial)
        test_form_data = {
            "firstName": "John",
            "lastName": "Doe",
            "email": "john.doe@example.com",
            "phone": "",  # Incomplete
            "ssn": "",    # Incomplete
            "dateOfBirth": ""  # Incomplete
        }
        
        # 1. Test saving a draft
        print("\n1. Testing draft save...")
        save_draft_payload = {
            "step_id": test_step_id,
            "employee_id": test_employee_id,
            "form_data": test_form_data
        }
        
        try:
            async with session.post(
                f"{BASE_URL}/api/onboarding/session/{test_session_id}/save-draft",
                json=save_draft_payload
            ) as resp:
                result = await resp.json()
                print(f"   Status: {resp.status}")
                print(f"   Response: {json.dumps(result, indent=2)}")
                
                if resp.status == 200:
                    print("   ✅ Draft saved successfully!")
                    draft_id = result.get('data', {}).get('draft_id')
                else:
                    print(f"   ❌ Failed to save draft: {result.get('message')}")
        except Exception as e:
            print(f"   ❌ Error saving draft: {e}")
        
        # 2. Test retrieving the draft
        print("\n2. Testing draft retrieval...")
        try:
            async with session.get(
                f"{BASE_URL}/api/onboarding/session/{test_session_id}/resume"
            ) as resp:
                result = await resp.json()
                print(f"   Status: {resp.status}")
                print(f"   Response: {json.dumps(result, indent=2)}")
                
                if resp.status == 200:
                    print("   ✅ Draft retrieved successfully!")
                    retrieved_data = result.get('data', {}).get('form_data', {})
                    print(f"   Completion: {result.get('data', {}).get('completion_percentage')}%")
                else:
                    print(f"   ❌ Failed to retrieve draft: {result.get('message')}")
        except Exception as e:
            print(f"   ❌ Error retrieving draft: {e}")
        
        # 3. Test updating the draft with more data
        print("\n3. Testing draft update with more data...")
        updated_form_data = {
            **test_form_data,
            "phone": "555-123-4567",
            "ssn": "123-45-6789"
        }
        
        update_draft_payload = {
            "step_id": test_step_id,
            "employee_id": test_employee_id,
            "form_data": updated_form_data
        }
        
        try:
            async with session.post(
                f"{BASE_URL}/api/onboarding/session/{test_session_id}/save-draft",
                json=update_draft_payload
            ) as resp:
                result = await resp.json()
                print(f"   Status: {resp.status}")
                
                if resp.status == 200:
                    print("   ✅ Draft updated successfully!")
                    print(f"   Auto-save count: {result.get('data', {}).get('auto_save_count')}")
                    print(f"   Completion: {result.get('data', {}).get('completion_percentage')}%")
                else:
                    print(f"   ❌ Failed to update draft: {result.get('message')}")
        except Exception as e:
            print(f"   ❌ Error updating draft: {e}")
        
        # 4. Test Save and Exit functionality
        print("\n4. Testing Save and Exit (email resume link)...")
        save_exit_payload = {
            "step_id": test_step_id,
            "employee_id": test_employee_id,
            "form_data": updated_form_data,
            "email": "john.doe@example.com"
        }
        
        try:
            async with session.post(
                f"{BASE_URL}/api/onboarding/session/{test_session_id}/save-and-exit",
                json=save_exit_payload
            ) as resp:
                result = await resp.json()
                print(f"   Status: {resp.status}")
                print(f"   Response: {json.dumps(result, indent=2)}")
                
                if resp.status == 200:
                    print("   ✅ Save and Exit successful!")
                    resume_url = result.get('data', {}).get('resume_url')
                    if resume_url:
                        # Extract token from URL
                        token = resume_url.split('token=')[-1] if 'token=' in resume_url else None
                        if token:
                            print(f"   Resume token: {token[:20]}...")
                            
                            # 5. Test resuming by token
                            print("\n5. Testing resume by token...")
                            async with session.get(
                                f"{BASE_URL}/api/onboarding/resume?token={token}"
                            ) as resume_resp:
                                resume_result = await resume_resp.json()
                                if resume_resp.status == 200:
                                    print("   ✅ Successfully resumed session by token!")
                                    print(f"   Session ID: {resume_result.get('data', {}).get('session_id')}")
                                    print(f"   Step ID: {resume_result.get('data', {}).get('step_id')}")
                                else:
                                    print(f"   ❌ Failed to resume by token: {resume_result.get('message')}")
                else:
                    print(f"   ❌ Failed to save and exit: {result.get('message')}")
        except Exception as e:
            print(f"   ❌ Error in save and exit: {e}")
        
        # 6. Test marking draft as complete
        print("\n6. Testing mark draft as complete...")
        try:
            async with session.post(
                f"{BASE_URL}/api/onboarding/session/{test_session_id}/mark-complete?step_id={test_step_id}"
            ) as resp:
                result = await resp.json()
                print(f"   Status: {resp.status}")
                
                if resp.status == 200:
                    print("   ✅ Draft marked as complete!")
                else:
                    print(f"   ❌ Failed to mark complete: {result.get('message')}")
        except Exception as e:
            print(f"   ❌ Error marking complete: {e}")
        
        print("\n" + "="*60)
        print("Session Persistence Testing Complete!")
        print("="*60)

if __name__ == "__main__":
    asyncio.run(test_session_persistence())