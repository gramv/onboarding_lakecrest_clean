#!/usr/bin/env python3
"""
Simple test to find existing approved applications and generate onboarding links
"""

import asyncio
import httpx
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"
MANAGER_EMAIL = "manager@demo.com"
MANAGER_PASSWORD = "password123"

async def test_existing_applications():
    """Find and use existing approved applications"""
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        print("\n" + "="*60)
        print("🔍 SEARCHING FOR EXISTING APPLICATIONS")
        print("="*60 + "\n")
        
        # Step 1: Login as manager
        print("✅ Logging in as manager...")
        login_response = await client.post("/auth/login", json={
            "email": MANAGER_EMAIL,
            "password": MANAGER_PASSWORD
        })
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.text}")
            return
        
        result = login_response.json()
        token = result["data"]["token"]
        print(f"✅ Manager logged in successfully\n")
        
        # Step 2: Get all applications
        print("📋 Fetching applications...")
        apps_response = await client.get(
            "/manager/applications",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if apps_response.status_code != 200:
            print(f"❌ Failed to fetch applications: {apps_response.text}")
            return
        
        apps_result = apps_response.json()
        applications = apps_result.get("data", []) if isinstance(apps_result, dict) else apps_result
        
        print(f"📊 Found {len(applications)} applications\n")
        
        # Step 3: Find approved applications with tokens
        approved_apps = []
        pending_apps = []
        
        for app in applications:
            if app.get("status") == "approved" and app.get("onboarding_token"):
                approved_apps.append(app)
            elif app.get("status") == "pending":
                pending_apps.append(app)
        
        print(f"✅ Approved applications with tokens: {len(approved_apps)}")
        print(f"⏳ Pending applications: {len(pending_apps)}\n")
        
        # Step 4: Display approved applications with onboarding URLs
        if approved_apps:
            print("="*60)
            print("🎫 APPROVED APPLICATIONS WITH ONBOARDING TOKENS")
            print("="*60)
            
            for i, app in enumerate(approved_apps, 1):
                full_name = app.get("full_name", f"{app.get('first_name', '')} {app.get('last_name', '')}")
                token = app.get("onboarding_token")
                url = f"http://localhost:3000/onboard?token={token}"
                
                print(f"\n{i}. {full_name}")
                print(f"   📧 Email: {app.get('email')}")
                print(f"   💼 Position: {app.get('position')}")
                print(f"   🔑 Application ID: {app.get('id')}")
                print(f"   🔗 Onboarding URL:")
                print(f"      {url}")
        
        # Step 5: Approve a pending application if any exist
        if pending_apps and not approved_apps:
            print("\n" + "="*60)
            print("⚡ AUTO-APPROVING A PENDING APPLICATION")
            print("="*60)
            
            # Take the first pending application
            app_to_approve = pending_apps[0]
            app_id = app_to_approve["id"]
            full_name = app_to_approve.get("full_name", f"{app_to_approve.get('first_name', '')} {app_to_approve.get('last_name', '')}")
            
            print(f"\n📝 Approving application for: {full_name}")
            print(f"   Email: {app_to_approve.get('email')}")
            
            # Approve the application
            approve_response = await client.post(
                f"/applications/{app_id}/approve",
                headers={"Authorization": f"Bearer {token}"},
                data={"manager_notes": "Auto-approved for testing"}
            )
            
            if approve_response.status_code == 200:
                approve_result = approve_response.json()
                if "data" in approve_result:
                    onboarding_token = approve_result["data"].get("onboarding_token")
                else:
                    onboarding_token = approve_result.get("onboarding_token")
                
                if onboarding_token:
                    url = f"http://localhost:3000/onboard?token={onboarding_token}"
                    
                    print(f"\n✅ APPLICATION APPROVED SUCCESSFULLY!")
                    print(f"\n🔗 ONBOARDING URL:")
                    print(f"   {url}")
                    print(f"\n📝 Instructions:")
                    print(f"   1. Copy the URL above")
                    print(f"   2. Open it in your browser")
                    print(f"   3. You should see the welcome page for {full_name}")
                    print(f"   4. Click 'Start Onboarding' to begin")
            else:
                print(f"❌ Failed to approve: {approve_response.text}")
        
        elif not approved_apps and not pending_apps:
            print("\n⚠️ No applications found. Please submit an application first.")
            print("\nTo create a test application:")
            print("1. Go to http://localhost:3000")
            print("2. Click on a property QR code")
            print("3. Fill out the job application form")
        
        print("\n" + "="*60)

if __name__ == "__main__":
    asyncio.run(test_existing_applications())