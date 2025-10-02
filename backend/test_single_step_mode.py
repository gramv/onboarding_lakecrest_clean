#!/usr/bin/env python3
"""
Test script to validate single-step mode detection after the fix.
Tests both normal onboarding and single-step invitation flows.
"""

import asyncio
import httpx
import json
from datetime import datetime
import sys

BASE_URL = "http://localhost:8000"

async def test_normal_onboarding():
    """Test that normal onboarding correctly sets single_step_mode to false"""
    print("\n" + "="*60)
    print("Testing Normal Onboarding Flow")
    print("="*60)
    
    async with httpx.AsyncClient() as client:
        # Create test application
        application_data = {
            "property_id": "test-prop-001",
            "position": "Test Position",
            "first_name": "Normal",
            "last_name": "Onboarding",
            "email": "normal@test.com",
            "phone": "555-0001"
        }
        
        print(f"\n1. Creating job application...")
        response = await client.post(f"{BASE_URL}/api/apply", json=application_data)
        if response.status_code != 200:
            print(f"   ❌ Failed to create application: {response.text}")
            return False
        
        application = response.json()
        application_id = application.get("id")
        print(f"   ✅ Application created: {application_id}")
        
        # Approve application (simulating manager approval)
        print(f"\n2. Approving application...")
        response = await client.post(
            f"{BASE_URL}/api/applications/{application_id}/approve",
            headers={"Authorization": "Bearer test-manager-token"}
        )
        if response.status_code != 200:
            print(f"   ❌ Failed to approve: {response.text}")
            return False
        
        approval_result = response.json()
        onboarding_token = approval_result.get("onboarding_token")
        print(f"   ✅ Application approved, onboarding token received")
        
        # Get onboarding session details
        print(f"\n3. Getting onboarding session details...")
        response = await client.get(f"{BASE_URL}/api/onboarding/welcome/{onboarding_token}")
        if response.status_code != 200:
            print(f"   ❌ Failed to get session: {response.text}")
            return False
        
        session_data = response.json()
        
        # Check the critical flags
        print(f"\n4. Checking session flags:")
        print(f"   Session ID: {session_data.get('session_id')}")
        print(f"   Single Step Mode: {session_data.get('single_step_mode')}")
        print(f"   Target Step: {session_data.get('target_step')}")
        print(f"   Current Step: {session_data.get('current_step')}")
        
        # Validate the flags
        if session_data.get('single_step_mode') == False:
            print(f"\n   ✅ SUCCESS: Normal onboarding correctly has single_step_mode = False")
            return True
        else:
            print(f"\n   ❌ FAILURE: Normal onboarding has single_step_mode = {session_data.get('single_step_mode')}")
            return False

async def test_single_step_invitation():
    """Test that single-step invitations correctly set single_step_mode to true"""
    print("\n" + "="*60)
    print("Testing Single-Step Invitation Flow")
    print("="*60)
    
    async with httpx.AsyncClient() as client:
        # Create single-step invitation
        invitation_data = {
            "step_id": "direct-deposit",
            "recipient_email": "singlestep@test.com",
            "recipient_name": "Single Step",
            "property_id": "test-prop-001",
            "expires_in_hours": 72
        }
        
        print(f"\n1. Creating single-step invitation...")
        response = await client.post(
            f"{BASE_URL}/api/onboarding/single-step-invite",
            json=invitation_data,
            headers={"Authorization": "Bearer test-hr-token"}
        )
        
        if response.status_code != 200:
            print(f"   ❌ Failed to create invitation: {response.text}")
            print(f"   Note: This endpoint might require HR authentication")
            return False
        
        invitation_result = response.json()
        invitation_token = invitation_result.get("token")
        print(f"   ✅ Single-step invitation created")
        
        # Get invitation session details
        print(f"\n2. Getting invitation session details...")
        response = await client.get(f"{BASE_URL}/api/onboarding/step/{invitation_token}")
        if response.status_code != 200:
            print(f"   ❌ Failed to get session: {response.text}")
            return False
        
        session_data = response.json()
        
        # Check the critical flags
        print(f"\n3. Checking session flags:")
        print(f"   Session ID: {session_data.get('session_id')}")
        print(f"   Single Step Mode: {session_data.get('single_step_mode')}")
        print(f"   Target Step: {session_data.get('target_step')}")
        print(f"   Current Step: {session_data.get('current_step')}")
        
        # Validate the flags
        if session_data.get('single_step_mode') == True and session_data.get('target_step') == "direct-deposit":
            print(f"\n   ✅ SUCCESS: Single-step invitation correctly has single_step_mode = True")
            return True
        else:
            print(f"\n   ❌ FAILURE: Single-step invitation has single_step_mode = {session_data.get('single_step_mode')}")
            return False

async def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("Single-Step Mode Detection Test Suite")
    print("Testing the fix for normal vs single-step onboarding")
    print("="*60)
    
    # Test normal onboarding
    normal_result = await test_normal_onboarding()
    
    # Test single-step invitation (may fail if auth required)
    single_step_result = await test_single_step_invitation()
    
    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    print(f"Normal Onboarding Test: {'✅ PASSED' if normal_result else '❌ FAILED'}")
    print(f"Single-Step Invitation Test: {'✅ PASSED' if single_step_result else '❌ FAILED (may need auth)'}")
    
    if normal_result:
        print("\n🎉 The main issue is fixed! Normal onboarding no longer shows as single-step mode.")
    else:
        print("\n⚠️  The issue persists. Check backend logs for details.")
    
    return 0 if normal_result else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)